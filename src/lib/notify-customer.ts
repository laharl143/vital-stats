import type { CustomerEmailKind, OrderStatus } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { renderNotificationEmail } from "@/lib/notify-admin";
import { channelLabel, manilaDate, paymentShort, pesoOf } from "@/lib/order-status";

// Customer order emails (VS-256, spec 0005). Every customer email goes through emailCustomer, which
// claims a CustomerEmail row for (order, kind) BEFORE sending: the unique index makes each email go
// out at most once, however often the OMS or PayMongo retries. No automatic retry on failure (AC-13).
// Never a product name, address or phone in an email, and never the token, email or name in a log.

export type EmailOutcome = "sent" | "already_sent" | "skipped" | "failed";

const log = (orderNumber: string, kind: CustomerEmailKind, outcome: EmailOutcome, code?: string) =>
  console.info(JSON.stringify({ event: "customer_email", orderNumber, kind, outcome, ...(code && { code }) }));

const codeOf = (err: unknown) => String((err as { code?: string })?.code ?? (err as { name?: string })?.name ?? "unknown");

type EmailOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  paymentChannel: string | null;
  paidAmount: { toFixed(n: number): string } | null;
  totalAmount: { toFixed(n: number): string } | null;
};

const wasPaid = (o: EmailOrder) => o.paymentStatus === "PAID" || o.paymentStatus === "REFUND_NEEDED";

// AC-12: subject (also the heading) and the optional extra line.
function wording(kind: CustomerEmailKind, o: EmailOrder): { subject: string; note?: string } {
  const n = o.orderNumber;
  switch (kind) {
    case "RECEIVED": return { subject: `We got your order ${n}` };
    case "PAID": return { subject: `Payment received for order ${n}` };
    case "SHIPPED": return { subject: `Your order ${n} is on its way` };
    case "DELIVERED": return { subject: `Your order ${n} was delivered` };
    case "CANCELLED":
      return { subject: `Your order ${n} was cancelled`, ...(wasPaid(o) && { note: `We'll refund your payment of ${pesoOf(o.paidAmount)}.` }) };
    case "REFUNDED":
      return {
        subject: `Your refund for order ${n}`,
        note: `${pesoOf(o.paidAmount)} was refunded to your ${channelLabel(o.paymentChannel)}. It can take a few days to show.`,
      };
  }
}

export async function emailCustomer(orderId: string, kind: CustomerEmailKind): Promise<EmailOutcome> {
  let orderNumber = "";
  let claimId: string | null = null;
  try {
    const o = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true, source: true, customerEmail: true, statusToken: true, status: true, paymentMethod: true,
        paymentStatus: true, paymentChannel: true, paidAmount: true, totalAmount: true, createdAt: true,
        items: { select: { quantity: true } },
      },
    });
    if (!o) return "skipped";
    orderNumber = o.orderNumber;

    const apiKey = process.env.RESEND_API_KEY;
    // An expired unpaid online order never got a first email, so it gets no "cancelled" one (AC-9).
    const cancelledUnpaid = kind === "CANCELLED" && o.paymentMethod !== "COD" && !wasPaid(o);
    if (!apiKey || o.source !== "STOREFRONT" || !o.customerEmail || !o.statusToken || cancelledUnpaid) {
      log(orderNumber, kind, "skipped");
      return "skipped";
    }

    try {
      claimId = (await prisma.customerEmail.create({ data: { orderId, kind }, select: { id: true } })).id;
    } catch (err) {
      if ((err as { code?: string })?.code !== "P2002") throw err;
      log(orderNumber, kind, "already_sent");
      return "already_sent";
    }

    const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const link = `${siteUrl}/orders/${o.statusToken}`;
    const count = o.items.reduce((n, i) => n + i.quantity, 0);
    const rows: [string, string][] = [
      ["Order", o.orderNumber],
      ["Items", `${count} ${count === 1 ? "item" : "items"}`],
      ["Total", pesoOf(o.totalAmount)],
      ["Payment", paymentShort(o)],
    ];
    const { subject, note } = wording(kind, o);
    const html = renderNotificationEmail({
      badge: "Order update", title: subject, submittedAt: manilaDate(new Date()), rows, ctaHref: link, ctaLabel: "View your order", note,
    });
    const text = [subject, ...(note ? ["", note] : []), "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `View your order: ${link}`].join("\n");

    const { error } = await new Resend(apiKey).emails.send(
      { from: process.env.RESEND_FROM_EMAIL ?? "VitalStats <onboarding@resend.dev>", to: o.customerEmail, subject, html, text },
      { idempotencyKey: `order-email/${orderId}/${kind}` },
    );
    if (error) throw Object.assign(new Error("resend"), { code: `resend_${error.name}` });

    await prisma.customerEmail.update({ where: { id: claimId }, data: { sentAt: new Date() } });
    log(orderNumber, kind, "sent");
    return "sent";
  } catch (err) {
    const code = codeOf(err).slice(0, 60);
    if (claimId) {
      await prisma.customerEmail.update({ where: { id: claimId }, data: { failedAt: new Date(), error: code } }).catch(() => {});
    }
    log(orderNumber, kind, "failed", code);
    return "failed";
  }
}

// A status the order was just moved to (by the OMS webhook or an admin), mapped to its email (AC-9).
const STATUS_EMAIL: Partial<Record<OrderStatus, CustomerEmailKind>> = {
  OUT_FOR_DELIVERY: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export async function emailForStatus(orderId: string, status: OrderStatus): Promise<EmailOutcome> {
  const kind = STATUS_EMAIL[status];
  return kind ? emailCustomer(orderId, kind) : "skipped";
}
