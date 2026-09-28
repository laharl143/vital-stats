import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { peso, toCentavos } from "@/lib/cart-quote";
import { cityProvince, firstName, manilaDate, paymentLine, type PaymentView } from "@/lib/order-status";
import FocusHeading from "./FocusHeading";

// The body of /orders/[token] (VS-256, spec 0005, AC-5 to AC-8). Shows only what the customer needs:
// never the phone, email, street, barangay, postal code, admin notes, OMS or PayMongo ids.

type Money = { toFixed(n: number): string } | null;
type StatusOrder = PaymentView & {
  orderNumber: string;
  createdAt: Date;
  customerName: string;
  customerAddress: string | null;
  shippingFee: Money;
  items: { id: string; productName: string; quantity: number; unitPrice: Money }[];
};

const card = { background: "#fff", border: "1px solid rgba(0,0,0,0.06)" };
const cents = (m: Money) => toCentavos(m?.toFixed(2) ?? null) ?? 0;

const STEPS = ["Received", "Confirmed", "Preparing", "Out for delivery", "Delivered"];
const STEP_OF: Record<string, number> = { PENDING: 0, CONFIRMED: 1, PROCESSING: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4 };

export default function OrderStatusView({ order, isNew }: { order: StatusOrder; isNew: boolean }) {
  const total = cents(order.totalAmount);
  const fee = cents(order.shippingFee);
  const where = cityProvince(order.customerAddress);
  const step = STEP_OF[order.status];
  const refundLine = order.paymentStatus === "REFUND_NEEDED" || order.paymentStatus === "REFUNDED";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center text-center gap-4 px-6 py-10 rounded-[6px]" style={card}>
        {isNew && <CheckCircle2 aria-hidden="true" size={44} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
        <FocusHeading focus={isNew} className="font-display text-[32px] md:text-[38px] font-light outline-none" style={{ color: "var(--ink)" }}>
          {isNew ? "Thank you, your order is in" : "Your order"}
        </FocusHeading>
        <p className="text-[13px] uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--ink-muted)" }}>
          Order number <span className="tabular-nums" style={{ color: "var(--ink)" }}>{order.orderNumber}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          Placed {manilaDate(order.createdAt)}
        </p>
        {isNew && (
          <p className="text-[15px] font-light max-w-[460px]" style={{ color: "var(--ink-mid)" }}>
            We&apos;ve emailed a copy to you. Keep the link in that email to check your order later.
          </p>
        )}
      </section>

      <section className="px-6 py-8 rounded-[6px]" style={card} aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="sr-only">Order progress</h2>
        {order.status === "CANCELLED" ? (
          <Notice icon={<CircleAlert aria-hidden="true" size={20} />}>
            This order was cancelled.{refundLine && ` ${paymentLine(order)}`}
          </Notice>
        ) : order.status === "AWAITING_PAYMENT" ? (
          <Notice icon={<Clock aria-hidden="true" size={20} />}>Waiting for your payment.</Notice>
        ) : (
          <ol className="grid grid-cols-5 gap-2">
            {STEPS.map((label, i) => {
              const reached = step !== undefined && i <= step;
              return (
                <li key={label} className="flex flex-col items-center gap-2 text-center" aria-current={i === step ? "step" : undefined}>
                  <span
                    className="block h-[6px] w-full rounded-full"
                    style={{ background: reached ? "var(--teal)" : "rgba(0,0,0,0.08)" }}
                  />
                  <span className="text-[12px] md:text-[13px]" style={{ color: i === step ? "var(--ink)" : "var(--ink-muted)", fontWeight: i === step ? 600 : 400 }}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="px-6 py-8 rounded-[6px] flex flex-col gap-4" style={card} aria-labelledby="items-heading">
        <h2 id="items-heading" className="text-[13px] uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--ink-muted)" }}>
          Items
        </h2>
        <ul className="flex flex-col divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-4 py-3 text-[14px]" style={{ color: "var(--ink)" }}>
              <span>
                {it.productName} <span style={{ color: "var(--ink-muted)" }}>× {it.quantity}</span>
              </span>
              {it.unitPrice && <span className="tabular-nums">{peso(cents(it.unitPrice) * it.quantity)}</span>}
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 text-[14px] pt-2" style={{ color: "var(--ink-mid)" }}>
          <Row label="Subtotal" value={peso(total - fee)} />
          <Row label="Delivery fee" value={peso(fee)} />
          <div className="flex justify-between pt-2" style={{ color: "var(--ink)" }}>
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-[22px] tabular-nums">{peso(total)}</dd>
          </div>
        </dl>
      </section>

      <section className="px-6 py-8 rounded-[6px] flex flex-col gap-3 text-[15px]" style={card} aria-label="Payment and delivery">
        <p className="px-5 py-3 rounded-[4px]" style={{ background: "var(--teal-pale)", color: "var(--ink)" }}>
          {paymentLine(order)}
          {order.paymentStatus === "EXPIRED" && (
            <>
              {" "}
              <Link href="/products" className="underline">Browse products</Link>
            </>
          )}
        </p>
        {where && (
          <p style={{ color: "var(--ink-mid)" }}>
            Delivering to {firstName(order.customerName)}, {where.city}, {where.province}
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-3 text-[15px]" style={{ color: "var(--ink)" }}>
      <span style={{ color: "var(--teal)" }}>{icon}</span>
      {children}
    </p>
  );
}
