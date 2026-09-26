// Rules for creating an order from the admin panel (VS-245), shared by the New order form and
// POST /api/orders so both refuse the same things with the same sentences. No database access here.

export const MAX_QUANTITY = 99;

export interface NewOrderItem { productId: string; quantity: number }

export interface NewOrderInput {
  customerName: string;
  customerContact: string;
  customerAddress: string | null;
  notes: string | null;
  items: NewOrderItem[];
}

export type ParseResult = { ok: true; value: NewOrderInput } | { ok: false; error: string };

// Trimmed text, or null when missing or blank.
export const cleanText = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export const isValidQuantity = (q: unknown): q is number =>
  typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= MAX_QUANTITY;

// Checks a request body and returns only the fields we use. Anything else the client sends (a
// unitPrice, a status, ...) is dropped: the price always comes from the product.
export function parseNewOrder(body: unknown): ParseResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fail = (error: string): ParseResult => ({ ok: false, error });

  const customerName = cleanText(b.customerName);
  if (!customerName) return fail("Enter the customer's name.");
  const customerContact = cleanText(b.customerContact);
  if (!customerContact) return fail("Enter the customer's contact (phone or Messenger).");
  if (!Array.isArray(b.items) || b.items.length === 0) return fail("Add at least one item.");

  const items: NewOrderItem[] = [];
  for (const raw of b.items as unknown[]) {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const productId = cleanText(item.productId);
    if (!productId) return fail("Pick a product for every item.");
    if (!isValidQuantity(item.quantity)) return fail(`Quantity must be a whole number from 1 to ${MAX_QUANTITY}.`);
    if (items.some((i) => i.productId === productId)) {
      return fail("The same product is in this order twice. Change its quantity instead.");
    }
    items.push({ productId, quantity: item.quantity });
  }

  return {
    ok: true,
    value: { customerName, customerContact, customerAddress: cleanText(b.customerAddress), notes: cleanText(b.notes), items },
  };
}

// A product price as a number. Prisma Decimals and JSON strings both arrive here; null means
// "price on inquiry".
export function toPrice(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : null;
}

// Sum of the priced lines. incomplete = at least one line has no price, so the real total is unknown.
export function orderTotal(lines: { quantity: number; price: number | null }[]): { total: number; incomplete: boolean } {
  let total = 0;
  let incomplete = false;
  for (const l of lines) {
    if (l.price === null) incomplete = true;
    else total += l.price * l.quantity;
  }
  return { total, incomplete };
}
