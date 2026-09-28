"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ShoppingBag, Stethoscope, Truck } from "lucide-react";
import ConsentCheckbox, { LegalLink } from "@/components/ConsentCheckbox";
import { serializeCart } from "@/lib/cart";
import { fetchQuote, formatCentavos, peso, toCentavos, type Quote, type QuoteLine } from "@/lib/cart-quote";
import {
  PROVINCES, deliveryFeeCentavos, validateCheckoutFields, type CheckoutFields, type FieldErrors,
} from "@/lib/checkout";
import { CONSENT_REQUIRED_MESSAGE } from "@/lib/legal";
import { clearCart, useCart } from "@/lib/useCart";

// The /checkout page body (VS-254, spec 0003). Lines come from the browser cart and are priced by
// POST /api/cart/quote (latest wins, like the cart page); POST /api/checkout checks them again and
// saves a pending cash on delivery order. One random key per visit makes a retry return the same order.
//
// Online payment (VS-255, spec 0004): the same submit returns a PayMongo checkoutUrl and the browser
// goes there. The cart and the key stay until /checkout/done sees the order paid; a return through
// PayMongo's cancel link (?cancelled=<key>) expires that order (once PayMongo confirms it's unpaid)
// and starts a fresh key.

const KEY_STORAGE = "vs-checkout-key";
const FIELD_ORDER: (keyof CheckoutFields)[] = ["name", "phone", "email", "street", "barangay", "city", "province", "postalCode", "notes"];
const EMPTY_FIELDS: CheckoutFields = { name: "", phone: "", email: "", street: "", barangay: "", city: "", province: "", postalCode: "", notes: "" };
const GENERIC_ERROR = "We couldn't place your order. Please try again.";

const noopSubscribe = () => () => {};
const card = { background: "#fff", border: "1px solid rgba(0,0,0,0.06)" };
const sellable = (l: QuoteLine | undefined) => !!l && l.status !== "out_of_stock" && l.status !== "unavailable";


type Payment = "cod" | "online";

export default function CheckoutView({ onlineEnabled }: { onlineEnabled: boolean }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // Back from PayMongo's cancel link (?cancelled=<key>). Read once; only shown after mount.
  const [cancelledKey] = useState(() =>
    typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("cancelled"),
  );
  const [payment, setPayment] = useState<Payment>(cancelledKey && onlineEnabled ? "online" : "cod");
  const [notice, setNotice] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const { items, remove, adjust } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedKey, setQuotedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fields, setFields] = useState<CheckoutFields>(EMPTY_FIELDS);
  const [consent, setConsent] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false); // on the way to the order status page (spec 0005)
  const router = useRouter();
  const keyRef = useRef<string | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const key = serializeCart(items);

  // Lowers a line the quote says is above its stock, only if the customer hasn't changed it since.
  const writeBack = (q: Quote, sent: typeof items) => {
    for (const l of q.lines) {
      const sentQty = sent.find((i) => i.slug === l.slug)?.qty;
      if (l.status === "adjusted" && sentQty !== undefined) adjust(l.slug, sentQty, l.qty);
    }
  };

  useEffect(() => {
    if (!mounted || placed || items.length === 0) return;
    const sent = items;
    const controller = new AbortController();
    fetchQuote(sent, controller.signal)
      .then((q) => {
        setQuote(q);
        setQuotedKey(serializeCart(sent));
        setFailed(false);
        writeBack(q, sent);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
    // `key` stands for `items` (a new array on every change of the stored cart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mounted, attempt, placed]);

  useEffect(() => {
    if (banner) bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [banner]);

  // Back from PayMongo's cancel link (AC-15). The server asks PayMongo first (AC-13b): only a
  // confirmed "expired" keeps the cart here with a new key. Anything else (paid, rescued, not
  // answerable yet) goes to /checkout/done with the same key, so nobody pays twice.
  useEffect(() => {
    if (!cancelledKey) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("cancelled");
    window.history.replaceState(null, "", url.pathname + url.search);
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: cancelledKey }),
    })
      .then(async (res) => {
        const state = res.status === 404 ? "expired" : ((await res.json().catch(() => null)) as { data?: { state?: string } } | null)?.data?.state;
        if (state !== "expired") throw new Error(state ?? `cancel ${res.status}`);
        try {
          window.sessionStorage.removeItem(KEY_STORAGE);
        } catch {}
        keyRef.current = null;
        setNotice("Payment cancelled. Your cart is still here.");
      })
      .catch(() => {
        setRedirecting(true);
        window.location.assign(`/checkout/done?key=${encodeURIComponent(cancelledKey)}`);
      });
  }, [cancelledKey]);

  if (placed) return <CheckoutSkeleton />;
  if (!mounted || (items.length > 0 && !quote && !failed)) return <CheckoutSkeleton />;
  if (items.length === 0) return <EmptyState />;
  if (!quote) {
    return (
      <div role="alert" className="flex flex-col items-center text-center gap-4 p-12 rounded-[6px]" style={card}>
        <h1 className="font-display text-[30px] font-light" style={{ color: "var(--ink)" }}>We couldn&apos;t load your order</h1>
        <p className="text-[14px] font-light" style={{ color: "var(--ink-muted)" }}>Your cart is still saved. Please try again.</p>
        <PrimaryButton onClick={() => setAttempt((n) => n + 1)}>Try again</PrimaryButton>
      </div>
    );
  }

  const pending = quotedKey !== key;
  const bySlug = new Map(quote.lines.map((l) => [l.slug, l]));
  const lines = items.map((i) => ({ item: i, line: bySlug.get(i.slug) }));
  const rxLines = lines.filter(({ line }) => line?.requiresPrescription);
  const blocked = lines.some(({ line }) => line && !sellable(line));
  const subtotal = toCentavos(quote.subtotal) ?? 0;
  const fee = deliveryFeeCentavos(fields.province);
  const total = fee === null ? null : subtotal + fee;
  const canPlace = rxLines.length === 0 && !blocked;
  const errors: FieldErrors = submitAttempted ? validateCheckoutFields(fields) : {};
  const consentError = submitAttempted && !consent;

  const set = (name: keyof CheckoutFields) => (value: string) => setFields((f) => ({ ...f, [name]: value }));

  const checkoutKey = () => {
    if (keyRef.current) return keyRef.current;
    let k: string | null = null;
    try {
      k = window.sessionStorage.getItem(KEY_STORAGE);
    } catch {}
    if (!k) {
      k = crypto.randomUUID();
      try {
        window.sessionStorage.setItem(KEY_STORAGE, k);
      } catch {} // storage blocked: the key still covers retries on this page view
    }
    return (keyRef.current = k);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (placing || redirecting) return;
    setSubmitAttempted(true);
    setBanner(null);
    setNotice(null);
    const errs = validateCheckoutFields(fields);
    const firstBad = FIELD_ORDER.find((k) => errs[k]) ?? (consent ? null : "consent");
    if (firstBad) {
      const el = document.getElementById(`co-${firstBad}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    if (!canPlace || pending || total === null) return;

    setPlacing(true);
    const sent = items;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutKey: checkoutKey(),
          items: sent,
          customer: { name: fields.name, phone: fields.phone, email: fields.email },
          address: { street: fields.street, barangay: fields.barangay, city: fields.city, province: fields.province, postalCode: fields.postalCode },
          notes: fields.notes,
          paymentMethod: payment,
          expectedTotal: formatCentavos(total),
          privacyConsent: consent,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            data?: { orderNumber: string; total: string; checkoutUrl?: string; paymentState?: string; statusToken?: string };
            error?: string; code?: string; quote?: Quote;
          }
        | null;
      // Online: go to PayMongo, or (a repeat of an order no longer waiting) to its status page. The
      // cart and the key stay: only /checkout/done clears them once the order is paid (spec 0004).
      if (res.ok && (json?.data?.checkoutUrl || json?.data?.paymentState)) {
        setRedirecting(true);
        window.location.assign(json.data.checkoutUrl ?? `/checkout/done?key=${checkoutKey()}`);
        return;
      }
      if (res.ok && json?.data) {
        try {
          window.sessionStorage.removeItem(KEY_STORAGE);
        } catch {}
        keyRef.current = null;
        setPlaced(true);
        clearCart();
        // COD: the order status page is the confirmation (spec 0005, AC-2).
        router.replace(json.data.statusToken ? `/orders/${json.data.statusToken}?new=1` : "/products");
        return;
      }
      if (json?.quote) {
        setQuote(json.quote);
        setQuotedKey(serializeCart(sent));
        writeBack(json.quote, sent);
      }
      setBanner(json?.error ?? GENERIC_ERROR);
    } catch {
      setBanner(GENERIC_ERROR); // the same key is sent again, so a retry can't create a second order
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: "var(--teal)" }}>Checkout</p>
      <h1 className="font-display text-[36px] md:text-[44px] font-light mb-3" style={{ color: "var(--ink)" }}>Almost there</h1>
      <p className="text-[14px] font-light mb-10 max-w-[560px]" style={{ color: "var(--ink-muted)" }}>
        No account needed. Tell us where to deliver, and we&apos;ll call or text you to confirm before your order ships.
      </p>

      <form noValidate onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        <div className="flex flex-col gap-6">
          {banner && (
            <div ref={bannerRef} role="alert" className="px-5 py-4 rounded-[6px] text-[14px]" style={{ background: "#FCE8E8", color: "#8A1C1C" }}>
              {banner}
            </div>
          )}
          {notice && !banner && (
            <div role="status" className="px-5 py-4 rounded-[6px] text-[14px]" style={{ background: "var(--teal-pale)", color: "var(--ink)" }}>
              {notice}
            </div>
          )}

          {rxLines.length > 0 && (
            <div className="flex flex-col gap-3 px-5 py-4 rounded-[6px]" style={{ background: "var(--teal-pale)" }}>
              <div className="flex gap-3">
                <Stethoscope aria-hidden="true" size={18} className="flex-shrink-0 mt-[2px]" style={{ color: "var(--teal-dark)" }} />
                <p className="text-[13px]" style={{ color: "var(--ink-mid)" }}>
                  Prescription products can&apos;t be ordered online yet. Remove them to check out, or{" "}
                  <Link href="/book-consult" className="underline font-medium" style={{ color: "var(--teal-dark)" }}>book a consult</Link>.
                </p>
              </div>
              <ul className="flex flex-col gap-2 list-none pl-7">
                {rxLines.map(({ item, line }) => (
                  <li key={item.slug} className="flex items-center justify-between gap-3 text-[13px]" style={{ color: "var(--ink)" }}>
                    <span>{line?.name ?? "This product"}</span>
                    <TextButton onClick={() => remove(item.slug)} label={`Remove ${line?.name ?? "this product"} from cart`}>Remove</TextButton>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blocked && (
            <div className="px-5 py-4 rounded-[6px] text-[13px]" style={{ background: "var(--teal-pale)", color: "var(--ink-mid)" }}>
              Some items in your cart can&apos;t be ordered right now.{" "}
              <Link href="/cart" className="underline font-medium" style={{ color: "var(--teal-dark)" }}>Review your cart</Link>
            </div>
          )}

          <Section title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Full name" error={errors.name} className="sm:col-span-2">
                <input id="co-name" autoComplete="name" value={fields.name} maxLength={100} onChange={(e) => set("name")(e.target.value)} {...inputProps(errors.name, "name")} />
              </Field>
              <Field id="phone" label="Mobile number" error={errors.phone} hint="We'll call or text this number to confirm.">
                <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={fields.phone} maxLength={20}
                  onChange={(e) => set("phone")(e.target.value)} {...inputProps(errors.phone, "phone", true)} />
              </Field>
              <Field id="email" label="Email" error={errors.email}>
                <input id="co-email" type="email" autoComplete="email" value={fields.email} maxLength={254}
                  onChange={(e) => set("email")(e.target.value)} {...inputProps(errors.email, "email")} />
              </Field>
            </div>
          </Section>

          <Section title="Delivery address">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="street" label="House or unit number and street" error={errors.street} className="sm:col-span-2">
                <input id="co-street" autoComplete="address-line1" value={fields.street} maxLength={200}
                  onChange={(e) => set("street")(e.target.value)} {...inputProps(errors.street, "street")} />
              </Field>
              <Field id="barangay" label="Barangay" error={errors.barangay}>
                <input id="co-barangay" autoComplete="address-line2" value={fields.barangay} maxLength={100}
                  onChange={(e) => set("barangay")(e.target.value)} {...inputProps(errors.barangay, "barangay")} />
              </Field>
              <Field id="city" label="City or municipality" error={errors.city}>
                <input id="co-city" autoComplete="address-level2" value={fields.city} maxLength={100}
                  onChange={(e) => set("city")(e.target.value)} {...inputProps(errors.city, "city")} />
              </Field>
              <Field id="province" label="Province" error={errors.province}>
                <select id="co-province" autoComplete="address-level1" value={fields.province}
                  onChange={(e) => set("province")(e.target.value)} {...inputProps(errors.province, "province")}>
                  <option value="">Choose a province</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field id="postalCode" label="Postal code" error={errors.postalCode}>
                <input id="co-postalCode" inputMode="numeric" autoComplete="postal-code" value={fields.postalCode} maxLength={4}
                  onChange={(e) => set("postalCode")(e.target.value.replace(/\D/g, ""))} {...inputProps(errors.postalCode, "postalCode")} />
              </Field>
              <Field id="notes" label="Delivery notes (optional)" error={errors.notes} hint="Landmarks or gate details for the rider." className="sm:col-span-2">
                <textarea id="co-notes" rows={3} value={fields.notes} maxLength={300}
                  onChange={(e) => set("notes")(e.target.value)} {...inputProps(errors.notes, "notes", true)} />
              </Field>
            </div>
          </Section>

          <Section title="Payment">
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Payment method</legend>
              <PaymentOption value="cod" selected={payment === "cod"} onSelect={setPayment}
                title="Cash on delivery" note="Pay the rider in cash when your order arrives."
                icon={<Truck aria-hidden="true" size={20} style={{ color: "var(--teal-dark)" }} />} />
              {onlineEnabled ? (
                <PaymentOption value="online" selected={payment === "online"} onSelect={setPayment}
                  title="Card or e wallet"
                  note="Card, GCash, Maya, GrabPay, QR Ph (any bank app, including MariBank and GoTyme) or online banking. You'll pay on PayMongo's secure page."
                  icon={<CreditCard aria-hidden="true" size={20} style={{ color: "var(--teal-dark)" }} />} />
              ) : (
                <label className="flex items-center gap-3 px-4 py-4 rounded-[4px] cursor-not-allowed" style={{ border: "1px solid rgba(0,0,0,0.1)", opacity: 0.6 }}>
                  <input type="radio" name="payment" value="online" disabled aria-describedby="co-online-off" />
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: "var(--ink)" }}>Card or e wallet</span>
                  <span id="co-online-off" className="text-[10px] uppercase tracking-[0.08em] font-semibold px-2 py-[2px] rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: "var(--ink-muted)" }}>
                    Unavailable right now
                  </span>
                </label>
              )}
            </fieldset>
          </Section>
        </div>

        <aside className="flex flex-col gap-4 p-6 rounded-[6px] lg:sticky lg:top-32" style={card} aria-label="Order summary">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[12px] uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--ink-muted)" }}>Order summary</h2>
            <Link href="/cart" className="text-[12px] underline underline-offset-4" style={{ color: "var(--teal-dark)" }}>Edit cart</Link>
          </div>
          <ul className="flex flex-col gap-3 list-none" aria-busy={pending}>
            {lines.map(({ item, line }) => (
              <SummaryLine key={item.slug} qty={item.qty} line={line} />
            ))}
          </ul>
          <div className="flex flex-col gap-2 pt-3 text-[14px]" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", opacity: pending ? 0.45 : 1 }}>
            <Row label={quote.estimate ? "Estimated subtotal" : "Subtotal"} value={peso(subtotal)} />
            <Row label="Delivery fee" value={fee === null ? null : peso(fee)} empty="Choose a province to see the delivery fee" />
          </div>
          {total !== null && (
            <div className="flex items-baseline justify-between gap-4 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", opacity: pending ? 0.45 : 1 }}>
              <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>{quote.estimate ? "Estimated total" : "Total"}</span>
              <span className="font-display text-[28px] tabular-nums" style={{ color: "var(--ink)" }}>{peso(total)}</span>
            </div>
          )}
          {!quote.omsChecked && (
            <p className="text-[12px] px-3 py-2 rounded-[4px]" style={{ background: "var(--teal-pale)", color: "var(--ink-mid)" }}>
              We couldn&apos;t check stock right now. We&apos;ll confirm availability when we call you.
            </p>
          )}

          <div id="co-consent" tabIndex={-1} className="flex flex-col gap-1 outline-none">
            <ConsentCheckbox checked={consent} onChange={setConsent} invalid={consentError}>
              I agree to the <LegalLink href="/terms">Terms</LegalLink> and have read the{" "}
              <LegalLink href="/privacy">Privacy Notice</LegalLink>.
            </ConsentCheckbox>
            {consentError && <p className="text-[12px] pl-1" style={{ color: "#DC2626" }}>{CONSENT_REQUIRED_MESSAGE}</p>}
          </div>

          {canPlace ? (
            <button
              type="submit"
              disabled={placing || pending || redirecting}
              className="w-full text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-4 rounded-[3px] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--teal)" }}
            >
              {payment === "online"
                ? placing || redirecting ? "Opening payment…" : total === null ? "Continue to payment" : `Continue to payment · ${peso(total)}`
                : placing ? "Placing order…" : total === null ? "Place order" : `Place order · ${peso(total)}`}
            </button>
          ) : (
            <p className="text-[12px] text-center" style={{ color: "var(--ink-muted)" }}>
              {rxLines.length > 0 ? "Remove prescription products to place your order." : "Remove unavailable items to place your order."}
            </p>
          )}
        </aside>
      </form>
    </>
  );
}

// Shared input props: the teal focus border, the red resting border when invalid, and the error link.
function inputProps(error: string | undefined, id: keyof CheckoutFields, withHint = false) {
  // The hint is hidden while the error shows (see Field), so point at whichever one is on screen.
  const describedBy = error ? `co-${id}-error` : withHint ? `co-${id}-hint` : undefined;
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "w-full px-4 py-3 text-[14px] rounded-[3px] bg-white outline-none transition-colors focus:border-[var(--teal)]!",
    style: { border: `1px solid ${error ? "#DC2626" : "rgba(0,0,0,0.15)"}`, color: "var(--ink)", fontFamily: "inherit" },
  };
}

function Field({ id, label, error, hint, className, children }: {
  id: keyof CheckoutFields; label: string; error?: string; hint?: string; className?: string; children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label htmlFor={`co-${id}`} className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "var(--ink-mid)" }}>{label}</label>
      {children}
      {hint && !error && <p id={`co-${id}-hint`} className="text-[12px]" style={{ color: "var(--ink-muted)" }}>{hint}</p>}
      {error && <p id={`co-${id}-error`} className="text-[12px]" style={{ color: "#DC2626" }}>{error}</p>}
    </div>
  );
}

function PaymentOption({ value, selected, onSelect, title, note, icon }: {
  value: Payment; selected: boolean; onSelect: (v: Payment) => void; title: string; note: string; icon: ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-4 rounded-[4px] cursor-pointer"
      style={selected ? { border: "1.5px solid var(--teal)", background: "var(--teal-pale)" } : { border: "1px solid rgba(0,0,0,0.15)" }}>
      <input type="radio" name="payment" value={value} checked={selected} onChange={() => onSelect(value)} style={{ accentColor: "var(--teal)" }} />
      <span className="flex-1">
        <span className="block text-[14px] font-semibold" style={{ color: "var(--ink)" }}>{title}</span>
        <span className="block text-[12px]" style={{ color: "var(--ink-muted)" }}>{note}</span>
      </span>
      {icon}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 p-6 rounded-[6px]" style={card}>
      <h2 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, empty }: { label: string; value: string | null; empty?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span style={{ color: "var(--ink-mid)" }}>{label}</span>
      {value === null
        ? <span className="text-[12px] text-right max-w-[180px]" style={{ color: "var(--ink-muted)" }}>{empty}</span>
        : <span className="tabular-nums" style={{ color: "var(--ink)" }}>{value}</span>}
    </div>
  );
}

function SummaryLine({ qty, line }: { qty: number; line: QuoteLine | undefined }) {
  if (!line) return <li className="h-12 rounded-[4px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />;
  const unit = toCentavos(line.unitPrice);
  const ok = sellable(line) && unit !== null;
  return (
    <li className="flex items-center gap-3">
      <div className="flex-shrink-0 w-12 h-12 rounded-[4px] overflow-hidden flex items-center justify-center" style={{ background: "var(--teal-pale)", opacity: ok ? 1 : 0.55 }}>
        {line.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
          : <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.4} style={{ color: "var(--teal-light)" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--ink)" }}>{line.name ?? "This product"}</p>
        <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
          {ok
            ? `Qty ${qty}${line.estimate ? " · Estimated" : ""}`
            : line.status === "out_of_stock" ? "Out of stock" : "No longer available online"}
        </p>
      </div>
      {ok && <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{peso(unit * qty)}</span>}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-12 rounded-[6px]" style={card}>
      <ShoppingBag aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal-light)" }} />
      <h1 className="font-display text-[30px] font-light" style={{ color: "var(--ink)" }}>Your cart is empty</h1>
      <p className="text-[14px] font-light max-w-[420px]" style={{ color: "var(--ink-muted)" }}>
        Add products to your cart first, then come back here to check out.
      </p>
      <Link href="/products" className="mt-2 inline-block text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] text-white hover:opacity-90" style={{ background: "var(--teal)" }}>
        Browse products
      </Link>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[12px] font-medium tracking-[0.08em] uppercase px-5 py-3 rounded-[3px] text-white hover:opacity-90" style={{ background: "var(--teal)" }}>
      {children}
    </button>
  );
}

function TextButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="text-[13px] font-medium underline underline-offset-4 min-h-11 px-1" style={{ color: "var(--ink-muted)" }}>
      {children}
    </button>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]" aria-busy="true" aria-label="Loading your order">
      <div className="flex flex-col gap-6">
        {[0, 1].map((i) => <div key={i} className="h-[240px] rounded-[6px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />)}
      </div>
      <div className="h-[320px] rounded-[6px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />
    </div>
  );
}
