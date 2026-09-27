// Guest cart kept in localStorage (VS-253, spec 0002). Only slugs and quantities are stored:
// names, prices and stock always come fresh from POST /api/cart/quote.
// Pure functions here; the React hook lives in useCart.ts.

export const CART_KEY = "vs-cart";
export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;

export interface CartItem {
  slug: string;
  qty: number;
}

export const isValidQty = (qty: unknown): qty is number =>
  Number.isInteger(qty) && (qty as number) >= 1 && (qty as number) <= MAX_QTY_PER_LINE;

const isValidSlug = (slug: unknown): slug is string =>
  typeof slug === "string" && slug.length >= 1 && slug.length <= 100;

// Anything unexpected (missing, bad JSON, another version, a bad line, a duplicate, too many
// lines) reads as an empty cart; the next change overwrites it.
export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { v?: unknown; items?: unknown };
    if (data?.v !== 1 || !Array.isArray(data.items) || data.items.length > MAX_LINES) return [];
    const seen = new Set<string>();
    const items: CartItem[] = [];
    for (const item of data.items as { slug?: unknown; qty?: unknown }[]) {
      if (!isValidSlug(item?.slug) || !isValidQty(item?.qty) || seen.has(item.slug)) return [];
      seen.add(item.slug);
      items.push({ slug: item.slug, qty: item.qty });
    }
    return items;
  } catch {
    return [];
  }
}

// Request body lines for POST /api/cart/quote and /api/checkout: at most MAX_LINES entries, each a
// slug of 1 to 100 characters and a whole quantity from 1 to 10. Duplicate slugs merge (summed,
// capped at 10) in first seen order. An empty list is valid here; checkout refuses it itself.
export function parseCartLines(raw: unknown): { ok: true; items: CartItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length > MAX_LINES) {
    return { ok: false, error: `items must be a list of at most ${MAX_LINES} lines.` };
  }
  const merged = new Map<string, number>();
  for (const item of raw as { slug?: unknown; qty?: unknown }[]) {
    const { slug, qty } = item ?? {};
    if (!isValidSlug(slug) || !isValidQty(qty)) {
      return { ok: false, error: `Each line needs a slug (1 to 100 characters) and a whole quantity from 1 to ${MAX_QTY_PER_LINE}.` };
    }
    merged.set(slug, Math.min((merged.get(slug) ?? 0) + qty, MAX_QTY_PER_LINE));
  }
  return { ok: true, items: [...merged].map(([slug, qty]) => ({ slug, qty })) };
}

export const serializeCart =(items: CartItem[]): string => JSON.stringify({ v: 1, items });

// Adds to an existing line or appends a new one, never above maxQty (itself capped at 10).
// Returns the same array when nothing changes (full line, full cart, or maxQty 0).
export function addItem(items: CartItem[], slug: string, qty: number, maxQty: number): CartItem[] {
  const cap = Math.min(maxQty, MAX_QTY_PER_LINE);
  const existing = items.find((i) => i.slug === slug);
  const next = Math.min((existing?.qty ?? 0) + qty, cap);
  if (next < 1 || next === existing?.qty) return items;
  if (existing) return items.map((i) => (i.slug === slug ? { ...i, qty: next } : i));
  if (items.length >= MAX_LINES) return items;
  return [...items, { slug, qty: next }];
}

// Returns the same array when the value is unchanged or invalid, so callers can skip the write.
export function setQty(items: CartItem[], slug: string, qty: number): CartItem[] {
  const line = items.find((i) => i.slug === slug);
  if (!line || line.qty === qty || !isValidQty(qty)) return items;
  return items.map((i) => (i.slug === slug ? { ...i, qty } : i));
}

export const removeItem = (items: CartItem[], slug: string): CartItem[] =>
  items.some((i) => i.slug === slug) ? items.filter((i) => i.slug !== slug) : items;

export const cartCount = (items: CartItem[]): number => items.reduce((n, i) => n + i.qty, 0);
