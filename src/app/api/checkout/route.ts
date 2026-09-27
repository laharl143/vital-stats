import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCentavos } from "@/lib/cart-quote";
import { checkSubmit, deliveryFeeCentavos, joinAddress, makeOrderNumber, parseCheckout } from "@/lib/checkout";
import { CONSENT_REQUIRED_MESSAGE, TERMS_VERSION, readConsent } from "@/lib/legal";
import { loadQuote } from "@/lib/load-quote";
import { notifyAdmin } from "@/lib/notify-admin";

// POST /api/checkout (VS-254, spec 0003). Public: turns the browser cart into a PENDING cash on
// delivery order after checking every line again through the OMS. Staff confirm it and send it to
// the OMS from the admin orders page, as for any other order.
//
// Safe to retry: the browser sends one random checkoutKey per checkout visit, and the unique index
// on Order.checkoutKey means a repeat (or a race) returns the first order instead of a second one.
// Logs only the order number, an outcome code and slugs: never a name, phone, email or address.

const MAX_ORDERS_PER_IP_PER_HOUR = 5;
const ORDER_NUMBER_TRIES = 3;

const log = (outcome: string, orderNumber?: string) =>
  console.info(JSON.stringify({ event: "checkout", ...(orderNumber && { orderNumber }), outcome }));

const existingOrder = (checkoutKey: string) =>
  prisma.order.findUnique({ where: { checkoutKey }, select: { orderNumber: true, totalAmount: true } });

const replay = (order: { orderNumber: string; totalAmount: { toFixed(n: number): string } | null }) => {
  log("replayed", order.orderNumber);
  return NextResponse.json({ data: { orderNumber: order.orderNumber, total: order.totalAmount?.toFixed(2) ?? "0.00" } });
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

  try {
    const already = await existingOrder(input.checkoutKey);
    if (already) return replay(already);

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    // ponytail: count then save, so a burst from one IP can slip a few past the limit; every order
    // still waits for a staff call. A per IP counter row with an atomic increment if it's ever abused.
    const recent = await prisma.order.count({
      where: { source: "STOREFRONT", ipAddress, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
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

    const items = quote.lines.map((line) => ({
      productId: productIdBySlug.get(line.slug)!, // every line is ok or unchecked, so its product exists
      productName: line.name!,
      quantity: line.qty,
      unitPrice: line.unitPrice!,
    }));
    const data = {
      source: "STOREFRONT" as const,
      status: "PENDING" as const,
      paymentMethod: "COD" as const,
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

    let order: { orderNumber: string } | null = null;
    for (let attempt = 0; attempt < ORDER_NUMBER_TRIES && !order; attempt++) {
      try {
        order = await prisma.order.create({
          data: { ...data, orderNumber: makeOrderNumber(new Date(), randomBytes(5)) },
          select: { orderNumber: true },
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
