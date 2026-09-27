"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ShoppingBag, Stethoscope } from "lucide-react";
import QtyStepper from "@/components/QtyStepper";
import { serializeCart } from "@/lib/cart";
import { fetchQuote, peso, toCentavos, type Quote, type QuoteLine } from "@/lib/cart-quote";
import { useCart } from "@/lib/useCart";

// The /cart page body (VS-253, spec 0002, AC-7 and AC-9 to AC-13). Lines come from the browser cart;
// names, prices and limits from POST /api/cart/quote, asked again on every change (latest wins).

const noopSubscribe = () => () => {};
const card = { background: "#fff", border: "1px solid rgba(0,0,0,0.06)" };

export default function CartView() {
  // false during the server render and hydration, so the saved cart never flashes as empty
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { items, setQty, remove, adjust } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedKey, setQuotedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // slug → the quantity we lowered it to; kept until the customer changes or removes that line
  const [lowered, setLowered] = useState<Record<string, number>>({});

  const key = serializeCart(items);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const sent = items;
    const controller = new AbortController();
    fetchQuote(sent, controller.signal)
      .then((q) => {
        setQuote(q);
        setQuotedKey(serializeCart(sent));
        setFailed(false);
        const fixes = q.lines.filter((l) => l.status === "adjusted");
        if (fixes.length === 0) return;
        setLowered((prev) => ({ ...prev, ...Object.fromEntries(fixes.map((l) => [l.slug, l.qty])) }));
        for (const l of fixes) {
          const sentQty = sent.find((i) => i.slug === l.slug)?.qty;
          if (sentQty !== undefined) adjust(l.slug, sentQty, l.qty);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
    // `key` stands for `items` (a new array on every change of the stored cart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mounted, attempt]);

  const forget = (slug: string) =>
    setLowered((prev) => {
      if (!(slug in prev)) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });

  if (!mounted || (items.length > 0 && !quote && !failed)) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-4 p-12 rounded-[6px]" style={card}>
        <ShoppingBag aria-hidden="true" size={40} strokeWidth={1.4} style={{ color: "var(--teal-light)" }} />
        <h2 className="font-display text-[26px] font-light" style={{ color: "var(--ink)" }}>
          Your cart is empty
        </h2>
        <p className="text-[14px] font-light max-w-[420px]" style={{ color: "var(--ink-muted)" }}>
          Browse our treatments and wellness products, then add what you need here.
        </p>
        <Link
          href="/products"
          className="mt-2 inline-block text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] text-white hover:opacity-90"
          style={{ background: "var(--teal)" }}
        >
          Browse products
        </Link>
      </div>
    );
  }

  const retry = () => setAttempt((n) => n + 1);

  if (!quote) {
    return (
      <div role="alert" className="flex flex-col items-center text-center gap-4 p-12 rounded-[6px]" style={card}>
        <h2 className="font-display text-[26px] font-light" style={{ color: "var(--ink)" }}>
          We couldn&apos;t load your cart
        </h2>
        <p className="text-[14px] font-light" style={{ color: "var(--ink-muted)" }}>
          Your items are still saved. Please try again.
        </p>
        <RetryButton onClick={retry} />
      </div>
    );
  }

  const pending = quotedKey !== key;
  const bySlug = new Map(quote.lines.map((l) => [l.slug, l]));
  const hasRx = items.some((i) => bySlug.get(i.slug)?.requiresPrescription);
  // Checkout needs every line sellable and none needing a prescription (spec 0003, AC-1).
  const hasUnsellable = items.some((i) => {
    const s = bySlug.get(i.slug)?.status;
    return s === "out_of_stock" || s === "unavailable";
  });
  const canCheckout = !hasRx && !hasUnsellable;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">
      <div className="flex flex-col gap-4">
        {failed && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-[6px]" style={card}>
            <span className="text-[14px]" style={{ color: "var(--ink)" }}>
              We couldn&apos;t update your cart. Your items are still saved.
            </span>
            <RetryButton onClick={retry} />
          </div>
        )}
        {!quote.omsChecked && (
          <p className="px-5 py-3 rounded-[6px] text-[13px]" style={{ background: "var(--teal-pale)", color: "var(--ink-mid)" }}>
            We couldn&apos;t check stock right now, it will be confirmed at checkout.
          </p>
        )}

        <ul className="flex flex-col gap-4 list-none">
          {items.map((item) => {
            const line = bySlug.get(item.slug);
            return (
              <CartLine
                key={item.slug}
                qty={item.qty}
                line={line}
                loweredTo={lowered[item.slug]}
                onQty={(q) => {
                  forget(item.slug);
                  setQty(item.slug, q);
                }}
                onRemove={() => {
                  forget(item.slug);
                  remove(item.slug);
                }}
              />
            );
          })}
        </ul>

        {hasRx && (
          <div className="flex gap-3 px-5 py-4 rounded-[6px]" style={{ background: "var(--teal-pale)" }}>
            <Stethoscope aria-hidden="true" size={18} className="flex-shrink-0 mt-[2px]" style={{ color: "var(--teal-dark)" }} />
            <p className="text-[13px]" style={{ color: "var(--ink-mid)" }}>
              Prescription products can&apos;t be ordered online yet. Remove them to check out, or{" "}
              <Link href="/book-consult" className="underline font-medium" style={{ color: "var(--teal-dark)" }}>
                book a consult
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 p-6 rounded-[6px] lg:sticky lg:top-32" style={card} aria-label="Order summary">
        <h2 className="text-[12px] uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--ink-muted)" }}>
          Order summary
        </h2>
        <div className="flex items-baseline justify-between gap-4" aria-busy={pending}>
          <span className="text-[14px]" style={{ color: "var(--ink)" }}>
            {quote.estimate ? "Estimated subtotal" : "Subtotal"}
          </span>
          <span
            className="font-display text-[26px] tabular-nums transition-opacity"
            style={{ color: "var(--ink)", opacity: pending ? 0.45 : 1 }}
          >
            {peso(toCentavos(quote.subtotal) ?? 0)}
          </span>
        </div>
        <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
          Delivery fee is calculated at checkout.
        </p>
        {canCheckout ? (
          <Link
            href="/checkout"
            className="w-full text-center text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] text-white hover:opacity-90"
            style={{ background: "var(--teal)" }}
          >
            Checkout
          </Link>
        ) : (
          <>
            <span
              role="link"
              aria-disabled="true"
              aria-describedby="checkout-blocked"
              className="w-full text-center text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] cursor-not-allowed"
              style={{ background: "rgba(13,21,18,0.08)", color: "var(--ink-muted)" }}
            >
              Checkout
            </span>
            <p id="checkout-blocked" className="text-[12px] text-center" style={{ color: "var(--ink-muted)" }}>
              {hasRx
                ? "Prescription products can't be ordered online yet. Remove them to check out, or book a consult."
                : "Remove unavailable items to check out."}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function CartLine({
  qty,
  line,
  loweredTo,
  onQty,
  onRemove,
}: {
  qty: number;
  line: QuoteLine | undefined;
  loweredTo: number | undefined;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  if (!line) return <li className="h-[112px] rounded-[6px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />;

  const sellable = line.status !== "out_of_stock" && line.status !== "unavailable";
  const unitCents = toCentavos(line.unitPrice);
  const name = line.name ?? "This product";

  return (
    <li className="flex gap-4 p-4 rounded-[6px]" style={card}>
      <div
        className="flex-shrink-0 w-20 h-20 rounded-[4px] overflow-hidden flex items-center justify-center"
        style={{ background: "var(--teal-pale)", opacity: sellable ? 1 : 0.55 }}
      >
        {line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag aria-hidden="true" size={24} strokeWidth={1.4} style={{ color: "var(--teal-light)" }} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0" style={{ opacity: sellable ? 1 : 0.6 }}>
            {line.name ? (
              <Link href={`/products/${line.slug}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--ink)" }}>
                {line.name}
              </Link>
            ) : (
              <span className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                {name}
              </span>
            )}
            {line.requiresPrescription && (
              <span
                className="ml-2 inline-block align-middle text-[10px] uppercase tracking-[0.08em] font-semibold px-2 py-[2px] rounded-full"
                style={{ background: "var(--teal-pale)", color: "var(--teal-dark)" }}
              >
                Needs a prescription
              </span>
            )}
          </div>
          {sellable && unitCents !== null && (
            <span className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
              {peso(unitCents * qty)}
            </span>
          )}
        </div>

        {sellable && unitCents !== null ? (
          <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            {peso(unitCents)} each{line.estimate && " · Estimated"}
          </p>
        ) : (
          <p className="text-[13px] font-medium" style={{ color: "var(--ink-muted)" }}>
            {line.status === "out_of_stock" ? "Out of stock" : "No longer available online"}
          </p>
        )}

        {loweredTo !== undefined && sellable && (
          <p className="text-[13px]" style={{ color: "var(--teal-dark)" }}>
            Only {loweredTo} available, we updated your quantity.
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-1">
          {sellable ? (
            <QtyStepper value={qty} max={line.maxQty} onChange={onQty} label={`Quantity of ${name}`} />
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-[13px] font-medium underline underline-offset-4 min-h-11 px-1"
            style={{ color: "var(--ink-muted)" }}
            aria-label={`Remove ${name} from cart`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium tracking-[0.08em] uppercase px-5 py-3 rounded-[3px] text-white hover:opacity-90"
      style={{ background: "var(--teal)" }}
    >
      Try again
    </button>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]" aria-busy="true" aria-label="Loading your cart">
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-[112px] rounded-[6px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />
        ))}
      </div>
      <div className="h-[220px] rounded-[6px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />
    </div>
  );
}
