"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock, Loader2 } from "lucide-react";
import { peso, toCentavos } from "@/lib/cart-quote";
import { clearCart } from "@/lib/useCart";

// The /checkout/done body (VS-255, spec 0004, AC-16). Coming back from PayMongo proves nothing, so
// this only asks the server (GET /api/checkout/status) until PayMongo's webhook has settled the
// order: every 2 seconds, for up to 60 seconds. The cart is cleared only once the order is paid.

const KEY_STORAGE = "vs-checkout-key"; // same key CheckoutView uses
const POLL_MS = 2_000;
const MAX_WAIT_MS = 60_000;
const card = { background: "#fff", border: "1px solid rgba(0,0,0,0.06)" };

type State = "awaiting_payment" | "paid" | "refund_needed" | "refunded" | "expired";
type View =
  | { kind: "checking" }
  | { kind: "slow" }
  | { kind: "missing" }
  | { kind: "done"; state: Exclude<State, "awaiting_payment">; orderNumber: string; total: string };

const forgetKey = () => {
  try {
    window.sessionStorage.removeItem(KEY_STORAGE);
  } catch {}
};

const noopSubscribe = () => () => {};
const readKey = () => new URL(window.location.href).searchParams.get("key");

export default function PaymentDoneView() {
  // undefined while server rendering, null when the link has no key.
  const key = useSyncExternalStore(noopSubscribe, readKey, () => undefined);
  const [view, setView] = useState<View>({ kind: "checking" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!key) return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/status?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        if (res.status === 404 || res.status === 400) {
          if (!stopped) setView({ kind: "missing" });
          return;
        }
        const json = (await res.json().catch(() => null)) as { data?: { state: State; orderNumber: string; total: string } } | null;
        const data = json?.data;
        if (data && data.state !== "awaiting_payment") {
          if (stopped) return;
          forgetKey(); // a new checkout gets a new key
          if (data.state === "paid") clearCart();
          setView({ kind: "done", state: data.state, orderNumber: data.orderNumber, total: data.total });
          return;
        }
      } catch {
        // a network blip: keep trying until the time is up
      }
      if (stopped) return;
      if (Date.now() - started >= MAX_WAIT_MS) {
        setView({ kind: "slow" });
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [key]);

  const shown: View = key === null ? { kind: "missing" } : view;
  useEffect(() => {
    if (shown.kind !== "checking") headingRef.current?.focus();
  }, [shown.kind]);

  if (shown.kind === "checking") {
    return (
      <Panel icon={<Loader2 aria-hidden="true" size={40} strokeWidth={1.4} className="animate-spin" style={{ color: "var(--teal)" }} />}
        title="Confirming your payment…" headingRef={headingRef} busy>
        <p>This takes a few seconds. Please keep this page open.</p>
      </Panel>
    );
  }
  if (shown.kind === "slow") {
    return (
      <Panel icon={<Clock aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
        title="Still confirming your payment" headingRef={headingRef}>
        <p>We&apos;ll message you at the mobile number you gave us as soon as it comes through. You don&apos;t need to pay again.</p>
        <BrowseLink />
      </Panel>
    );
  }
  if (shown.kind === "missing") {
    return (
      <Panel icon={<CircleAlert aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
        title="We couldn't find this payment" headingRef={headingRef}>
        <p>If you paid, we&apos;ll message you at the mobile number you gave us. Otherwise, you can go back to checkout.</p>
        <CheckoutLink />
      </Panel>
    );
  }

  const orderLine = (
    <p className="text-[13px] uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--ink-muted)" }}>
      Order number <span className="tabular-nums" style={{ color: "var(--ink)" }}>{shown.orderNumber}</span>
    </p>
  );
  switch (shown.state) {
    case "paid":
      return (
        <Panel icon={<CheckCircle2 aria-hidden="true" size={44} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
          title="Thank you, your order is paid" headingRef={headingRef}>
          {orderLine}
          <p className="px-5 py-3 rounded-[4px]" style={{ background: "var(--teal-pale)", color: "var(--ink)" }}>
            Paid {peso(toCentavos(shown.total) ?? 0)}. We&apos;ll text you when your order ships.
          </p>
          <BrowseLink />
        </Panel>
      );
    case "refund_needed":
      return (
        <Panel icon={<CircleAlert aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
          title="We couldn't place your order" headingRef={headingRef}>
          {orderLine}
          <p>We received your payment but couldn&apos;t place your order. Our team will contact you about your refund.</p>
          <BrowseLink />
        </Panel>
      );
    case "refunded":
      return (
        <Panel icon={<CircleAlert aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
          title="Your payment was refunded" headingRef={headingRef}>
          {orderLine}
          <p>Your payment was refunded. Our team has been in touch about your order.</p>
          <BrowseLink />
        </Panel>
      );
    case "expired":
      return (
        <Panel icon={<CircleAlert aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal)" }} />}
          title="Payment not completed" headingRef={headingRef}>
          <p>Your payment didn&apos;t go through, so no order was placed. Your cart is still saved.</p>
          <CheckoutLink />
        </Panel>
      );
  }
}

function Panel({ icon, title, headingRef, busy, children }: {
  icon: React.ReactNode; title: string; headingRef: React.RefObject<HTMLHeadingElement | null>; busy?: boolean; children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy={busy || undefined} className="flex flex-col items-center text-center gap-5 px-6 py-14 rounded-[6px] mx-auto max-w-[640px] text-[15px] font-light" style={{ ...card, color: "var(--ink-mid)" }}>
      {icon}
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-[32px] md:text-[38px] font-light outline-none" style={{ color: "var(--ink)" }}>
        {title}
      </h1>
      {children}
    </div>
  );
}

const buttonClass = "mt-2 inline-block text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] text-white hover:opacity-90";

function BrowseLink() {
  return <Link href="/products" className={buttonClass} style={{ background: "var(--teal)" }}>Keep browsing</Link>;
}

function CheckoutLink() {
  return <Link href="/checkout" className={buttonClass} style={{ background: "var(--teal)" }}>Back to checkout</Link>;
}
