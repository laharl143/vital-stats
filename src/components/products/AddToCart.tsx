"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QtyStepper from "@/components/QtyStepper";
import { MAX_QTY_PER_LINE } from "@/lib/cart";
import { fetchQuote, type QuoteLine } from "@/lib/cart-quote";
import { useCart } from "@/lib/useCart";

// Add to cart on the product page (VS-253, spec 0002, AC-1 to AC-4, AC-10). Only rendered for a
// product with a storefront price; the no price "Inquire Now" path stays in the page.
type Stock = { state: "loading" } | { state: "known"; line: QuoteLine } | { state: "unchecked" };

const buttonClass =
  "block w-full text-center text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] transition-opacity duration-200";
const enabledStyle = { background: "var(--teal)", color: "#fff" };
const disabledStyle = { background: "rgba(13,21,18,0.08)", color: "var(--ink-muted)", cursor: "not-allowed" };

export default function AddToCart({ slug, inquireHref }: { slug: string; inquireHref: string }) {
  const { items, add } = useCart();
  const [stock, setStock] = useState<Stock>({ state: "loading" });
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchQuote([{ slug, qty: 1 }], controller.signal)
      .then((quote) => {
        const line = quote.lines[0];
        // The OMS was unreachable: add is still allowed, checkout confirms stock (AC-10).
        setStock(line.status === "unchecked" ? { state: "unchecked" } : { state: "known", line });
      })
      .catch(() => {
        if (!controller.signal.aborted) setStock({ state: "unchecked" });
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => {
      setAdded(false);
      setAnnounce(""); // cleared so the next add is announced again
    }, 2000);
    return () => clearTimeout(t);
  }, [added]);

  if (stock.state === "loading") {
    return (
      <button type="button" disabled aria-disabled="true" className={buttonClass} style={disabledStyle}>
        Checking stock…
      </button>
    );
  }

  const line = stock.state === "known" ? stock.line : null;

  if (line?.status === "unavailable") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-center" style={{ color: "var(--ink-muted)" }}>
          Not available online
        </p>
        <Link href={inquireHref} className={buttonClass} style={enabledStyle}>
          Inquire Now
        </Link>
      </div>
    );
  }

  if (line?.status === "out_of_stock") {
    return (
      <button type="button" disabled aria-disabled="true" className={buttonClass} style={disabledStyle}>
        Out of stock
      </button>
    );
  }

  const maxQty = line?.maxQty ?? MAX_QTY_PER_LINE;
  const inCart = items.find((i) => i.slug === slug)?.qty ?? 0;
  const room = Math.max(0, maxQty - inCart);
  const pick = Math.min(Math.max(qty, 1), Math.max(room, 1));

  const onAdd = () => {
    add(slug, pick, maxQty);
    setAdded(true);
    setQty(1);
    setAnnounce("Added to cart");
  };

  return (
    <div className="flex flex-col gap-3">
      {room > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-muted)" }}>
              Quantity
            </span>
            <QtyStepper value={pick} max={room} onChange={setQty} label="Quantity to add" />
          </div>
          <button type="button" onClick={onAdd} className={`${buttonClass} hover:opacity-90`} style={enabledStyle}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
        </>
      ) : (
        <button type="button" disabled aria-disabled="true" className={buttonClass} style={disabledStyle}>
          Maximum in your cart
        </button>
      )}

      {inCart > 0 && (
        <Link href="/cart" className="text-[13px] text-center font-medium underline underline-offset-4" style={{ color: "var(--teal)" }}>
          View cart ({inCart} in cart)
        </Link>
      )}

      {stock.state === "unchecked" && (
        <p className="text-[12px] text-center" style={{ color: "var(--ink-muted)" }}>
          We couldn&apos;t check stock right now, it will be confirmed at checkout.
        </p>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
