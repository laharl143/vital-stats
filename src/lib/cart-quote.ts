// Prices and limits for cart lines (VS-253, spec 0002). Pure: the route hands in the storefront
// products and the OMS availability it read, so every rule here is unit tested without I/O.
// Money is whole centavos (integers) throughout; never parseFloat for money.

import { MAX_QTY_PER_LINE, type CartItem } from "./cart";
import type { OmsAvailability } from "./oms";

export const CART_CURRENCY = "PHP";

export type LineStatus = "ok" | "adjusted" | "out_of_stock" | "unavailable" | "unchecked";

export interface QuoteProduct {
  slug: string;
  name: string;
  price: string | null; // Prisma Decimal as a string
  currency: string;
  isActive: boolean;
  requiresPrescription: boolean;
  imageUrl: string | null;
}

export interface QuoteLine {
  slug: string;
  name: string | null;
  imageUrl: string | null;
  requiresPrescription: boolean;
  unitPrice: string | null;
  currency: string | null;
  qty: number;
  maxQty: number;
  status: LineStatus;
  estimate: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: string;
  currency: string;
  estimate: boolean;
  omsChecked: boolean;
}

// "1299.9" → 129990, "10" → 1000, "0.005" → 0 (cut, not rounded). Anything else → null.
export function toCentavos(price: string | null): number | null {
  const m = price?.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0").slice(0, 2));
}

export const formatCentavos = (c: number): string =>
  `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;

// 129990 → "₱1,299.90", for display only.
export const peso = (centavos: number) =>
  `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildQuote(
  requested: CartItem[],
  products: QuoteProduct[],
  availability: OmsAvailability,
): { quote: Quote; mismatched: string[]; unsellable: string[] } {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const mismatched: string[] = [];
  const unsellable: string[] = [];
  let subtotal = 0;
  let estimate = false;

  const lines = requested.map(({ slug, qty }): QuoteLine => {
    const p = bySlug.get(slug);
    const base = {
      slug,
      name: p?.name ?? null,
      imageUrl: p?.imageUrl ?? null,
      requiresPrescription: p?.requiresPrescription ?? false,
    };
    const unavailable = (): QuoteLine => ({
      ...base, unitPrice: null, currency: null, qty, maxQty: 0, status: "unavailable", estimate: false,
    });

    const storeCents = toCentavos(p?.price ?? null);
    if (!p || !p.isActive || storeCents === null || p.currency !== CART_CURRENCY) return unavailable();

    if (!availability.ok) {
      const lineQty = Math.min(qty, MAX_QTY_PER_LINE);
      subtotal += storeCents * lineQty;
      estimate = true;
      return {
        ...base, unitPrice: formatCentavos(storeCents), currency: CART_CURRENCY,
        qty: lineQty, maxQty: MAX_QTY_PER_LINE, status: "unchecked", estimate: true,
      };
    }

    const stock = availability.bySku.get(slug);
    const omsCents = toCentavos(stock?.price ?? null);
    if (!stock || omsCents === null || stock.currency !== CART_CURRENCY) {
      unsellable.push(slug);
      return unavailable();
    }
    if (omsCents !== storeCents) mismatched.push(slug);

    const maxQty = Math.min(Math.max(0, Math.floor(stock.available)), MAX_QTY_PER_LINE);
    if (maxQty === 0) {
      return { ...base, unitPrice: null, currency: null, qty, maxQty: 0, status: "out_of_stock", estimate: false };
    }
    const lineQty = Math.min(qty, maxQty);
    subtotal += omsCents * lineQty;
    return {
      ...base, unitPrice: formatCentavos(omsCents), currency: CART_CURRENCY,
      qty: lineQty, maxQty, status: lineQty < qty ? "adjusted" : "ok", estimate: false,
    };
  });

  return {
    quote: { lines, subtotal: formatCentavos(subtotal), currency: CART_CURRENCY, estimate, omsChecked: availability.ok },
    mismatched,
    unsellable,
  };
}

// Browser side call to POST /api/cart/quote. Throws on any failure; callers decide the fallback.
export async function fetchQuote(items: CartItem[], signal?: AbortSignal): Promise<Quote> {
  const res = await fetch("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    signal,
  });
  const json = (await res.json().catch(() => null)) as { data?: Quote } | null;
  if (!res.ok || !json?.data) throw new Error(`Cart quote failed (${res.status})`);
  return json.data;
}
