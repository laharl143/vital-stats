import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCentavos, toCentavos } from "@/lib/cart-quote";
import { checkSubmit, deliveryFeeCentavos, joinAddress, makeOrderNumber, parseCheckout } from "@/lib/checkout";
import { CONSENT_REQUIRED_MESSAGE, TERMS_VERSION, readConsent } from "@/lib/legal";
import { loadQuote } from "@/lib/load-quote";
import { notifyAdmin } from "@/lib/notify-admin";
import { PAYMENT_WINDOW_MS, expireOrder, expirePayments, paymentState } from "@/lib/paid-order";
import { createCheckoutSession } from "@/lib/paymongo";

// POST /api/checkout (VS-254, spec 0003). Public: turns the browser cart into a PENDING cash on
// delivery order after checking every line again through the OMS. Staff confirm it and send it to
// the OMS from the admin orders page, as for any other order.
//
// Online payment (VS-255, spec 0004): the same checks, then an AWAITING_PAYMENT order and a PayMongo
// Checkout Session. The browser goes to PayMongo; only PayMongo's signed webhook marks it paid.
//
// Safe to retry: the browser sends one random checkoutKey per checkout visit, and the unique index
// on Order.checkoutKey means a repeat (or a race) returns the first order instead of a second one.
// Logs only the order number, an outcome code and slugs: never a name, phone, email or address.

export const maxDuration = 30; // room for the PayMongo check before expiry (AC-13b)

const MAX_ORDERS_PER_IP_PER_HOUR = 5;
const ORDER_NUMBER_TRIES = 3;

const log = (outcome: string, orderNumber?: string) =>
  console.info(JSON.stringify({ event: "checkout", ...(orderNumber && { orderNumber }), outcome }));

const ONLINE_UNAVAILABLE = "Online payment is unavailable right now. Please choose cash on delivery or try again in a moment.";

const existingOrder = (checkoutKey: string) =>
  prisma.order.findUnique({
    where: { checkoutKey },
    select: { orderNumber: true, totalAmount: true, status: true, paymentStatus: true, paymongoCheckoutUrl: true, paymentExpiresAt: true, createdAt: true },
  });

// A repeat of the same checkout (AC-5). An online order still awaiting payment inside its window gets
// its stored PayMongo URL again; any other online order (including one whose expiry was deferred,
// AC-13b) reports its payment state for /checkout/done.
const replay = (order: NonNullable<Awaited<ReturnType<typeof existingOrder>>>) => {
  log("replayed", order.orderNumber);
  const total = order.totalAmount?.toFixed(2) ?? "0.00";
  // Both: the lease (AC-13b) moves paymentExpiresAt forward, but never reopens the 60 minute window.
  const now = Date.now();
  const open = (o: typeof order) =>
    !!o.paymentExpiresAt && o.paymentExpiresAt.getTime() > now && o.createdAt.getTime() + PAYMENT_WINDOW_MS > now;
  if (order.status === "AWAITING_PAYMENT" && order.paymongoCheckoutUrl && open(order)) {
    return NextResponse.json({ data: { orderNumber: order.orderNumber, total, checkoutUrl: order.paymongoCheckoutUrl } });
  }
  const state = paymentState(order.paymentStatus);
  return NextResponse.json({ data: { orderNumber: order.orderNumber, total, ...(state && { paymentState: state }) } });
};

const onlineUnavailable = () => {
  log("online_unavailable");
  return NextResponse.json({ error: ONLINE_UNAVAILABLE, code: "online_unavailable" }, { status: 409 });
};

const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === "P2002";
// Prisma messages can repeat the query data (names, addresses), so only a code or class name is logged.
const errorCode = (error: unknown) => (error as { code?: string })?.code ?? (error instanceof Error ? error.name : "unknown");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = parseCheckout(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const consent = readConsent(body?.privacyConsent);
  if (!consent) return NextResponse.json({ error: CONSENT_REQUIRED_MESSAGE }, { status: 400 });

  const online = input.paymentMethod === "online";
  const siteUrl = process.env.NEXTAUTH_URL?.replace(/\/+$/, "");

  try {
    await expirePayments({ checkoutKey: input.checkoutKey }); // lazy expiry of this key's order only (AC-13, AC-13b)
    const already = await existingOrder(input.checkoutKey);
    if (already) return replay(already);

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    // ponytail: count then save, so a burst from one IP can slip a few past the limit; every order
    // still waits for a staff call. A per IP counter row with an atomic increment if it's ever abused.
    const recent = await prisma.order.count({
      where: { source: "STOREFRONT", ipAddress, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (online && (!process.env.PAYMONGO_SECRET_KEY || !siteUrl)) return onlineUnavailable();
    if (recent >= MAX_ORDERS_PER_IP_PER_HOUR) {
      log("rate_limited");
      return NextResponse.json(
        { error: "Too many orders from this connection. Please try again later or message us." },
        { status: 429 },
      );
    }

    const { quote, productIdBySlug } = await loadQuote(input.items, "POST /api/checkout", { fresh: true }); // never the 30 s cache at submit
    const feeCentavos = deliveryFeeCentavos(input.province)!; // the province was validated above
    const check = checkSubmit(quote, feeCentavos, input.expectedTotalCentavos);
    if (!check.ok) {
      log(check.code);
      const total = formatCentavos(check.totalCentavos);
      if (check.code === "prescription_required") {
        return NextResponse.json(
          { error: "Prescription products can't be ordered online yet.", code: check.code, quote, total },
          { status: 422 },
        );
      }
      const error =
        check.code === "cart_changed"
          ? "Some items changed. Please review your order and place it again."
          : "Prices changed. Please review the new total and place your order again.";
      return NextResponse.json({ error, code: check.code, quote, total }, { status: 409 });
    }
    // PayMongo must charge exactly what the OMS will accept, so only an OMS checked PHP quote (AC-3).
    // The currency guard is defensive: buildQuote always answers PHP today.
    if (online && (!quote.omsChecked || quote.currency !== "PHP")) return onlineUnavailable();

    const items = quote.lines.map((line) => ({
      productId: productIdBySlug.get(line.slug)!, // every line is ok or unchecked, so its product exists
      productName: line.name!,
      quantity: line.qty,
      unitPrice: line.unitPrice!,
    }));
    const data = {
      source: "STOREFRONT" as const,
      ...(online
        ? {
            status: "AWAITING_PAYMENT" as const,
            paymentMethod: "PREPAID" as const,
            paymentStatus: "UNPAID" as const,
            paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
          }
        : { status: "PENDING" as const, paymentMethod: "COD" as const }),
      customerName: input.name,
      customerContact: input.phone,
      customerEmail: input.email,
      customerAddress: joinAddress(input),
      notes: input.notes,
      shippingFee: formatCentavos(feeCentavos),
      totalAmount: formatCentavos(check.totalCentavos),
      currency: quote.currency,
      stockUnchecked: !quote.omsChecked,
      checkoutKey: input.checkoutKey,
      ipAddress,
      privacyVersion: consent.privacyVersion,
      termsVersion: TERMS_VERSION,
      consentedAt: consent.consentedAt,
      items: { create: items },
    };

    let order: { id: string; orderNumber: string } | null = null;
    for (let attempt = 0; attempt < ORDER_NUMBER_TRIES && !order; attempt++) {
      try {
        order = await prisma.order.create({
          data: { ...data, orderNumber: makeOrderNumber(new Date(), randomBytes(5)) },
          select: { id: true, orderNumber: true },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Either a racing request with the same key won (return its order), or the number clashed.
        const winner = await existingOrder(input.checkoutKey);
        if (winner) return replay(winner);
      }
    }
    if (!order) {
      log("order_number_exhausted");
      return NextResponse.json({ error: "We couldn't place your order. Please try again." }, { status: 500 });
    }

    if (online) return startPayment(order, input, feeCentavos, check.totalCentavos, quote.lines, siteUrl!);

    const total = formatCentavos(check.totalCentavos);
    log(quote.omsChecked ? "placed" : "placed_unchecked", order.orderNumber);
    try {
      await notifyAdmin({
        kind: "order",
        orderNumber: order.orderNumber,
        customerName: input.name,
        phone: input.phone,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        total: `₱${(check.totalCentavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
    } catch (err) {
      console.error("[POST /api/checkout] admin email failed", errorCode(err));
    }

    return NextResponse.json({ data: { orderNumber: order.orderNumber, total } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/checkout]", errorCode(error));
    return NextResponse.json({ error: "We couldn't place your order. Please try again." }, { status: 500 });
  }
}

// Creates the PayMongo session for a just saved AWAITING_PAYMENT order (AC-2, AC-4). The line items
// are unit prices (PayMongo multiplies by quantity) plus a delivery fee line, and must add up to the
// order total to the centavo, or nothing is sent to PayMongo. The admin email waits for payment.
async function startPayment(
  order: { id: string; orderNumber: string },
  input: { checkoutKey: string; name: string; email: string; phone: string },
  feeCentavos: number,
  totalCentavos: number,
  lines: { name: string | null; unitPrice: string | null; qty: number }[],
  siteUrl: string,
) {
  const items = [
    ...lines.map((l) => ({ name: l.name!, amount: toCentavos(l.unitPrice) ?? 0, quantity: l.qty })),
    { name: "Delivery fee", amount: feeCentavos, quantity: 1 },
  ];
  const sum = items.reduce((n, l) => n + l.amount * l.quantity, 0);
  const session =
    sum === totalCentavos && items.every((l) => l.amount > 0)
      ? await createCheckoutSession(
          {
            orderNumber: order.orderNumber,
            lines: items,
            successUrl: `${siteUrl}/checkout/done?key=${input.checkoutKey}`,
            cancelUrl: `${siteUrl}/checkout?cancelled=${input.checkoutKey}`,
            // PayMongo's page puts its own +63 in front, so send only the 10 digits after it (VS-255).
            billing: { name: input.name, email: input.email, phone: input.phone.replace(/^\+63/, "") },
          },
          { secretKey: process.env.PAYMONGO_SECRET_KEY },
        )
      : ({ ok: false, message: "line items don't add up to the order total" } as const);

  if (!session.ok) {
    await expireOrder(order, "session_failed");
    return NextResponse.json({ error: ONLINE_UNAVAILABLE, code: "online_unavailable" }, { status: 502 });
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { paymongoCheckoutId: session.value.id, paymongoCheckoutUrl: session.value.checkoutUrl },
  });
  log("awaiting_payment", order.orderNumber);
  return NextResponse.json(
    { data: { orderNumber: order.orderNumber, total: formatCentavos(totalCentavos), checkoutUrl: session.value.checkoutUrl } },
    { status: 201 },
  );
}
