// The life of an online order after checkout (VS-255, spec 0004): marked paid from PayMongo's
// signed webhook (or its API, checked before expiry), sent to the OMS with its payment record, expired when abandoned, and refunded
// when the OMS can't take it. Shared by the PayMongo webhook, the checkout status and cancel
// endpoints, the admin confirm and refund routes, and the admin orders list.
//
// Every state change is a conditional write, so repeated webhooks, a double click, or two of
// these racing can never apply the same change twice. Logs carry the order number and an outcome
// code only, never a name, phone, email, address or provider body.

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCentavos, peso, toCentavos } from "@/lib/cart-quote";
import { notifyAdmin } from "@/lib/notify-admin";
import { sendOrderToOms } from "@/lib/oms";
import { createRefund, expireCheckoutSession, getCheckoutSession, parsePaidSession, type PaidEvent } from "@/lib/paymongo";

export const PAYMENT_WINDOW_MS = 60 * 60 * 1000; // AC-2: an unpaid online order waits 60 minutes
const EXPIRE_BATCH = 5; // PayMongo calls per admin list load (AC-13b)
const LEASE_MS = 2 * 60 * 1000;

const log = (orderNumber: string, outcome: string) =>
  console.info(JSON.stringify({ event: "payment", orderNumber, outcome }));
const errorCode = (error: unknown) => (error as { code?: string })?.code ?? (error instanceof Error ? error.name : "unknown");

const paymongo = () => ({ secretKey: process.env.PAYMONGO_SECRET_KEY });

// Emails never fail the webhook, the send or a refund.
async function email(n: Parameters<typeof notifyAdmin>[0]) {
  try {
    await notifyAdmin(n);
  } catch (err) {
    console.error("[paid-order] admin email failed", errorCode(err));
  }
}

const pesoOf = (amount: { toFixed(n: number): string } | null) => peso(toCentavos(amount?.toFixed(2) ?? null) ?? 0);

export async function emailRefundNeeded(orderId: string, reason: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, customerName: true, customerContact: true, paidAmount: true },
  });
  if (o) await email({ kind: "refund_needed", orderNumber: o.orderNumber, customerName: o.customerName, phone: o.customerContact, paid: pesoOf(o.paidAmount), reason });
}

// ── Paid ────────────────────────────────────────────────────────────────────────────────────

export type MarkPaidResult =
  | { outcome: "unknown_session" }
  | { outcome: "paid" | "refund_needed" | "duplicate"; orderId: string; orderNumber: string; needsSend: boolean };

// AC-7, AC-9, AC-11, AC-14. Called with a payment read from PayMongo's API for the session: by the
// verified webhook, or by checkThenExpire (AC-13b). The order is found by its PayMongo session id,
// never by anything the browser sent.
export async function markPaid(ev: PaidEvent): Promise<MarkPaidResult> {
  const order = await prisma.order.findUnique({
    where: { paymongoCheckoutId: ev.checkoutId },
    select: { id: true, orderNumber: true, totalAmount: true, currency: true, paymongoPaymentId: true, paymentStatus: true, omsOrderId: true },
  });
  if (!order) return { outcome: "unknown_session" };

  // A repeat: the payment is already recorded. Retry the send only if it is paid and still unsent.
  const repeat = { outcome: "duplicate" as const, orderId: order.id, orderNumber: order.orderNumber };
  if (order.paymongoPaymentId) return { ...repeat, needsSend: order.paymentStatus === "PAID" && !order.omsOrderId };

  const expected = toCentavos(order.totalAmount?.toFixed(2) ?? null);
  const matches = expected === ev.amountCentavos && ev.currency === order.currency.toUpperCase();
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, paymongoPaymentId: null },
    data: {
      // Late payments on an expired order are honoured too (AC-14), so no status condition here.
      status: "PENDING",
      paymentStatus: matches ? "PAID" : "REFUND_NEEDED",
      paymongoPaymentId: ev.paymentId,
      paymentChannel: ev.channel,
      paidAt: ev.paidAt,
      paidAmount: formatCentavos(ev.amountCentavos),
      omsSendError: matches
        ? null
        : `PayMongo reports ${peso(ev.amountCentavos)} ${ev.currency} paid, but the order total is ${peso(expected ?? 0)} ${order.currency}. Refund the customer.`,
    },
  });
  // A racing delivery of the same event won; it schedules the send.
  if (count === 0) return { ...repeat, needsSend: false };

  log(order.orderNumber, matches ? "paid" : "paid_amount_mismatch");
  return { outcome: matches ? "paid" : "refund_needed", orderId: order.id, orderNumber: order.orderNumber, needsSend: matches };
}

// Runs inside after() once the webhook has answered PayMongo: the admin email, then the send.
export async function settlePaid(result: MarkPaidResult) {
  if (result.outcome === "unknown_session") return;
  if (result.outcome === "paid") {
    const o = await prisma.order.findUnique({
      where: { id: result.orderId },
      select: { orderNumber: true, customerName: true, customerContact: true, totalAmount: true, paymentChannel: true, items: { select: { quantity: true } } },
    });
    if (o) {
      await email({
        kind: "order", orderNumber: o.orderNumber, customerName: o.customerName, phone: o.customerContact,
        itemCount: o.items.reduce((n, i) => n + i.quantity, 0), total: pesoOf(o.totalAmount), paidChannel: o.paymentChannel ?? "unknown",
      });
    }
  }
  if (result.outcome === "refund_needed") {
    await emailRefundNeeded(result.orderId, "The amount PayMongo reports as paid doesn't match the order total.");
  }
  if (result.needsSend) await sendPaidOrder(result.orderId);
}

// ── Send to the OMS ─────────────────────────────────────────────────────────────────────────

export type SendResult = { ok: true } | { ok: false; message: string; status: 409 | 422 };

// AC-8, AC-10, AC-11, AC-19. Builds the OMS request only from stored columns, so every retry
// (a repeated webhook or the admin Send to OMS button) sends the same bytes.
export async function sendPaidOrder(orderId: string): Promise<SendResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { quantity: true, product: { select: { slug: true, requiresPrescription: true } } } } },
  });
  if (!order || order.paymentStatus !== "PAID") return { ok: false, message: "This order hasn't been paid yet.", status: 409 };
  if (order.omsOrderId) return { ok: false, message: "This order was already sent to the OMS.", status: 409 };
  if (!order.paidAmount || !order.paidAt || !order.paymongoPaymentId || !order.paymentChannel) {
    return { ok: false, message: "This order's payment record is incomplete, so it can't be sent.", status: 422 };
  }

  const result = await sendOrderToOms(
    {
      ...order,
      shippingFee: order.shippingFee.toFixed(2),
      payment: {
        amount: order.paidAmount.toFixed(2),
        currency: order.currency,
        provider: "paymongo",
        channel: order.paymentChannel,
        reference: order.paymongoPaymentId,
        paidAt: order.paidAt.toISOString(),
      },
    },
    { baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY, paymentMethod: "prepaid" },
  );

  if (result.ok) {
    // Two writes: the OMS webhook finds orders by orderNumber and may already have moved the
    // status (it can land between the OMS reply and this write). The ids are always saved; the
    // status only moves if nothing else moved it first (spec 0004, State transitions).
    await prisma.order.updateMany({
      where: { id: orderId, omsOrderId: null },
      data: { omsCustomerId: result.customerId, omsOrderId: result.orderId, sentToOmsAt: new Date(), omsSendError: null },
    });
    await prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
    log(order.orderNumber, "sent");
    return { ok: true };
  }

  if (result.retryable) {
    await prisma.order.updateMany({ where: { id: orderId, omsOrderId: null }, data: { omsSendError: result.message } });
    log(order.orderNumber, "send_failed");
    return { ok: false, message: result.message, status: 422 };
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: "PAID", omsOrderId: null },
    data: { paymentStatus: "REFUND_NEEDED", omsSendError: result.message },
  });
  log(order.orderNumber, "refund_needed");
  if (count > 0) await emailRefundNeeded(orderId, result.message);
  return { ok: false, message: result.message, status: 422 };
}

// ── Expire ──────────────────────────────────────────────────────────────────────────────────

// The write only: an unpaid order waiting for payment becomes CANCELLED / EXPIRED, so a paid order
// is never touched. Callers with a PayMongo session go through checkThenExpire first (AC-13b).
export async function expireOrder(order: { id: string; orderNumber: string }, outcome = "expired") {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "AWAITING_PAYMENT", paymentStatus: "UNPAID" },
    data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
  });
  if (count > 0) log(order.orderNumber, outcome);
  return count > 0;
}

type Expirable = { id: string; orderNumber: string; paymongoCheckoutId: string | null; paymentExpiresAt: Date | null };

// AC-13, AC-13b, AC-15. Before an order expires (60 minutes up, or the customer cancelled), ask
// PayMongo whether its session was paid: a paid one is rescued, one PayMongo can't answer for yet
// stays waiting, and only the rest expire. Callers pass an AWAITING_PAYMENT / UNPAID order.
export async function checkThenExpire(order: Expirable, outcome = "expired", now = new Date()) {
  if (!order.paymongoCheckoutId) return expireOrder(order, outcome); // no session (AC-4): nothing to ask

  // Lease: push paymentExpiresAt 2 minutes out. Another sweep or poll moved it first → it holds
  // the order, skip. This also spaces rechecks of a deferred order 2 minutes apart.
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "AWAITING_PAYMENT", paymentExpiresAt: order.paymentExpiresAt },
    data: { paymentExpiresAt: new Date(now.getTime() + LEASE_MS) },
  });
  if (count === 0) return false;

  const defer = () => {
    log(order.orderNumber, "expire_deferred");
    return false;
  };

  const fetched = await getCheckoutSession(order.paymongoCheckoutId, paymongo());
  if (!fetched.ok && !fetched.permanent) return defer();
  // A 4xx, or a different session back: nothing at PayMongo to wait for or to expire.
  const session = fetched.ok ? (fetched.value as { id?: unknown; attributes?: Record<string, unknown> } | null) : null;
  if (session?.id !== order.paymongoCheckoutId) return expireOrder(order, outcome);

  const paid = parsePaidSession(session);
  if (!("bad" in paid)) {
    const result = await markPaid(paid);
    if (result.outcome === "duplicate") return false; // the webhook got there first and owns the send
    log(order.orderNumber, "rescued_paid");
    after(async () => {
      try {
        await settlePaid(result);
      } catch (err) {
        console.error(JSON.stringify({ event: "payment", orderNumber: order.orderNumber, outcome: "settle_failed", code: errorCode(err) }));
      }
    });
    return false;
  }
  // No payment yet, but the intent says it's going through: PayMongo is still attaching it (AC-6b).
  const intent = session.attributes?.payment_intent as { attributes?: { status?: unknown } } | undefined;
  if (intent?.attributes?.status === "succeeded" || intent?.attributes?.status === "processing") return defer();

  // Close the session before the order, so nobody can pay it after we cancel. PayMongo refusing
  // (the session was just paid, or it can't be reached) means wait, never cancel.
  if (session.attributes?.status !== "expired") {
    const closed = await expireCheckoutSession(order.paymongoCheckoutId, paymongo());
    if (!closed.ok) return defer();
  }
  return expireOrder(order, outcome);
}

// Lazy expiry (no timer). With a checkoutKey only that one order is considered (status endpoint,
// checkout submit); without one, the admin list checks up to EXPIRE_BATCH stale orders.
export async function expirePayments(opts: { checkoutKey?: string; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const stale = await prisma.order.findMany({
    where: {
      status: "AWAITING_PAYMENT",
      paymentStatus: "UNPAID",
      paymentExpiresAt: { lt: now },
      ...(opts.checkoutKey && { checkoutKey: opts.checkoutKey }),
    },
    select: { id: true, orderNumber: true, paymongoCheckoutId: true, paymentExpiresAt: true },
    take: opts.checkoutKey ? 1 : EXPIRE_BATCH,
  });
  for (const order of stale) await checkThenExpire(order, "expired", now);
}

// ── Refund ──────────────────────────────────────────────────────────────────────────────────

export type RefundResult = { ok: true } | { ok: false; message: string; status: 400 | 404 | 409 | 422 };

// AC-12. Through PayMongo's refund API, or recorded as done by hand (for a channel PayMongo can't
// refund by API) with a required note.
export async function refundOrder(orderId: string, opts: { manual?: boolean; note?: string }, now = new Date()): Promise<RefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, paymentStatus: true, omsOrderId: true, paidAmount: true, paymongoPaymentId: true, adminNotes: true },
  });
  if (!order) return { ok: false, message: "Order not found", status: 404 };
  if (order.paymentStatus === "REFUNDED") return { ok: false, message: "This order was already refunded.", status: 409 };
  // ponytail: a PAID order whose first send is still running could be refunded and sent at once;
  // staff only see Refund after a send failed, so the window is tiny. A claim column if it bites.
  const eligible = order.paymentStatus === "REFUND_NEEDED" || (order.paymentStatus === "PAID" && !order.omsOrderId);
  if (!eligible) {
    return { ok: false, message: "Only a paid order that isn't in the OMS, or one flagged for refund, can be refunded here.", status: 409 };
  }

  const note = opts.note?.trim() ?? "";
  if (opts.manual && (note.length === 0 || note.length > 500)) {
    return { ok: false, message: "Add a note (up to 500 characters) saying how the customer was refunded.", status: 400 };
  }

  let refundId: string | null = null;
  if (!opts.manual) {
    const cents = toCentavos(order.paidAmount?.toFixed(2) ?? null);
    if (!cents || !order.paymongoPaymentId) return { ok: false, message: "This order has no PayMongo payment to refund.", status: 422 };
    const res = await createRefund({ paymentId: order.paymongoPaymentId, amountCentavos: cents, orderNumber: order.orderNumber }, paymongo());
    if (!res.ok) {
      log(order.orderNumber, "refund_failed");
      return { ok: false, message: res.message, status: 422 };
    }
    refundId = res.value.id;
  }

  const stamp = `[Manual refund ${now.toISOString().slice(0, 10)}] ${note}`;
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { in: ["PAID", "REFUND_NEEDED"] } },
    data: {
      paymentStatus: "REFUNDED",
      status: "CANCELLED",
      refundId,
      refundedAt: now,
      ...(opts.manual && { adminNotes: order.adminNotes ? `${order.adminNotes}\n${stamp}` : stamp }),
    },
  });
  if (count === 0) return { ok: false, message: "This order was already refunded.", status: 409 };
  log(order.orderNumber, opts.manual ? "refunded_manual" : "refunded");
  return { ok: true };
}

// ── Status for the customer ─────────────────────────────────────────────────────────────────

export type PaymentState = "awaiting_payment" | "paid" | "refund_needed" | "refunded" | "expired";

// AC-16. Derived from paymentStatus only; the status endpoint never returns personal data.
export function paymentState(paymentStatus: string | null): PaymentState | null {
  switch (paymentStatus) {
    case "UNPAID": return "awaiting_payment";
    case "PAID": return "paid";
    case "REFUND_NEEDED": return "refund_needed";
    case "REFUNDED": return "refunded";
    case "EXPIRED": return "expired";
    default: return null;
  }
}

