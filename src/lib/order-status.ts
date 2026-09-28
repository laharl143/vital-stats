import { randomBytes } from "node:crypto";
import { peso, toCentavos } from "@/lib/cart-quote";

// The customer's view of an order (VS-256, spec 0005): the secret link token, and the plain words
// the status page and the customer emails share. Pure functions, no database.

// 32 random bytes, base64url: 43 characters that can't be guessed (AC-1).
export const makeStatusToken = () => randomBytes(32).toString("base64url");
export const isStatusToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

type Money = { toFixed(n: number): string } | null;
export const pesoOf = (amount: Money) => peso(toCentavos(amount?.toFixed(2) ?? null) ?? 0);

const CHANNELS: Record<string, string> = {
  card: "card", gcash: "GCash", maya: "Maya", grab_pay: "GrabPay", qrph: "QR Ph", dob: "online banking",
};
export const channelLabel = (channel: string | null) => (channel && CHANNELS[channel]) || "online payment";

export type PaymentView = {
  status: string;
  paymentStatus: string | null;
  paymentChannel: string | null;
  paidAmount: Money;
  totalAmount: Money;
};

// AC-7. Null paymentStatus means cash on delivery (storefront COD orders never get one).
export function paymentLine(o: PaymentView): string {
  switch (o.paymentStatus) {
    case "PAID": return `Paid online (${channelLabel(o.paymentChannel)})`;
    case "REFUND_NEEDED": return "We received your payment but couldn't complete your order. Our team will contact you about your refund.";
    case "REFUNDED": return `Your payment of ${pesoOf(o.paidAmount)} was refunded.`;
    case "EXPIRED": return "Payment not completed.";
    case "UNPAID": return "Not paid yet.";
    default:
      if (o.status === "DELIVERED") return "Paid in cash on delivery.";
      if (o.status === "CANCELLED") return "Nothing to pay."; // a cancelled COD order is never collected
      return `Pay ${pesoOf(o.totalAmount)} in cash when it arrives.`;
  }
}

// The short form for the email's Payment row (AC-11).
export function paymentShort(o: PaymentView): string {
  switch (o.paymentStatus) {
    case "PAID": return `Paid online (${channelLabel(o.paymentChannel)})`;
    case "REFUND_NEEDED": return "Refund pending";
    case "REFUNDED": return "Refunded";
    default: return "Cash on delivery";
  }
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

// joinAddress writes "street, barangay, city, province postal". Read from the end, so a comma inside
// the street doesn't shift anything. An address the OMS rewrote into another shape gives null (AC-5).
export function cityProvince(address: string | null): { city: string; province: string } | null {
  const parts = (address ?? "").split(",").map((p) => p.trim());
  if (parts.length < 4) return null;
  const city = parts[parts.length - 2];
  const province = parts[parts.length - 1].replace(/\s*\d{4}$/, "");
  return city && province ? { city, province } : null;
}

// 27 Sep 2026, in Manila time. Built from parts: en-GB now spells September "Sept".
export function manilaDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}
