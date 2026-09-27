// Rules for guest checkout (VS-254, spec 0003). Pure: shared by the /checkout form (inline errors,
// fee, total) and POST /api/checkout (validation, fee, submit check), so there is one set of rules.
// Money is whole centavos throughout, like cart-quote.ts.

import { parseCartLines, type CartItem } from "./cart";
import { toCentavos, type Quote } from "./cart-quote";

export const METRO_MANILA = "Metro Manila";

// Metro Manila first, then every province alphabetically (82 as of 2026).
export const PROVINCES: readonly string[] = [
  METRO_MANILA,
  ...[
    "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora",
    "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan",
    "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu",
    "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental",
    "Dinagat Islands", "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo",
    "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte",
    "Maguindanao del Norte", "Maguindanao del Sur", "Marinduque", "Masbate", "Misamis Occidental",
    "Misamis Oriental", "Mountain Province", "Negros Occidental", "Negros Oriental", "Northern Samar",
    "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga",
    "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor", "Sorsogon",
    "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur",
    "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay",
  ].sort((a, b) => a.localeCompare(b, "en")),
];

// Flat delivery fees. Placeholders until the owner checks real courier rates (spec 0003 follow up).
export const DELIVERY_FEE_CENTAVOS = { metroManila: 10000, provincial: 18000 } as const;

export const deliveryFeeCentavos = (province: string): number | null =>
  province === METRO_MANILA
    ? DELIVERY_FEE_CENTAVOS.metroManila
    : PROVINCES.includes(province)
      ? DELIVERY_FEE_CENTAVOS.provincial
      : null;

// 0917 123 4567, 9171234567, 639171234567 and +63 917 123 4567 all become +639171234567.
export function normalizeMobile(raw: string): string | null {
  const m = raw.replace(/[\s\-()]/g, "").match(/^(?:\+63|63|0)?(9\d{9})$/);
  return m ? `+63${m[1]}` : null;
}

export interface CheckoutFields {
  name: string;
  phone: string;
  email: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
}
export type FieldErrors = Partial<Record<keyof CheckoutFields, string>>;

export const MOBILE_MESSAGE = "Enter a Philippine mobile number, for example 0917 123 4567";

const between = (v: string, min: number, max: number) => v.trim().length >= min && v.trim().length <= max;

// Every AC-4 and AC-5 rule, in form order (the first key is the first invalid field).
export function validateCheckoutFields(f: CheckoutFields): FieldErrors {
  const e: FieldErrors = {};
  if (!between(f.name, 2, 100)) e.name = "Enter your full name (2 to 100 characters).";
  if (!normalizeMobile(f.phone)) e.phone = MOBILE_MESSAGE;
  const email = f.email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
  if (!between(f.street, 1, 200)) e.street = "Enter your house or unit number and street (up to 200 characters).";
  if (!between(f.barangay, 1, 100)) e.barangay = "Enter your barangay (up to 100 characters).";
  if (!between(f.city, 1, 100)) e.city = "Enter your city or municipality (up to 100 characters).";
  if (!PROVINCES.includes(f.province)) e.province = "Choose your province.";
  if (!/^\d{4}$/.test(f.postalCode.trim())) e.postalCode = "Enter your 4 digit postal code.";
  if (f.notes.trim().length > 300) e.notes = "Keep delivery notes to 300 characters.";
  return e;
}

export const joinAddress = (f: Pick<CheckoutFields, "street" | "barangay" | "city" | "province" | "postalCode">): string =>
  `${f.street.trim()}, ${f.barangay.trim()}, ${f.city.trim()}, ${f.province} ${f.postalCode.trim()}`;

export interface CheckoutInput {
  checkoutKey: string;
  items: CartItem[];
  name: string;
  phone: string; // normalized
  email: string; // lowercased
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
  expectedTotalCentavos: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown) => (typeof v === "string" ? v : "");

// The POST /api/checkout body, minus consent (checked separately through readConsent).
export function parseCheckout(body: unknown): { ok: true; value: CheckoutInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.checkoutKey !== "string" || !UUID.test(b.checkoutKey)) return { ok: false, error: "Missing or invalid checkout key." };

  const lines = parseCartLines(b.items);
  if (!lines.ok) return lines;
  if (lines.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const customer = (b.customer ?? {}) as Record<string, unknown>;
  const address = (b.address ?? {}) as Record<string, unknown>;
  const fields: CheckoutFields = {
    name: str(customer.name), phone: str(customer.phone), email: str(customer.email),
    street: str(address.street), barangay: str(address.barangay), city: str(address.city),
    province: str(address.province), postalCode: str(address.postalCode), notes: str(b.notes),
  };
  const errors = Object.values(validateCheckoutFields(fields));
  if (errors.length > 0) return { ok: false, error: errors[0]! };

  if (b.paymentMethod !== "cod") return { ok: false, error: "Only cash on delivery is available right now." };
  const expected = typeof b.expectedTotal === "string" ? toCentavos(b.expectedTotal) : null;
  if (expected === null || !/^\d+(\.\d{1,2})?$/.test(b.expectedTotal as string)) {
    return { ok: false, error: "Missing or invalid expected total." };
  }

  return {
    ok: true,
    value: {
      checkoutKey: b.checkoutKey.toLowerCase(),
      items: lines.items,
      name: fields.name.trim(),
      phone: normalizeMobile(fields.phone)!,
      email: fields.email.trim().toLowerCase(),
      street: fields.street.trim(),
      barangay: fields.barangay.trim(),
      city: fields.city.trim(),
      province: fields.province,
      postalCode: fields.postalCode.trim(),
      notes: fields.notes.trim() || null,
      expectedTotalCentavos: expected,
    },
  };
}

// VS-YYMMDD-XXXXX: the Manila date plus 5 characters that can't be misread over the phone.
const ORDER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function makeOrderNumber(now: Date, random: Uint8Array): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "2-digit", month: "2-digit", day: "2-digit",
  }).format(now).replace(/-/g, "");
  const suffix = Array.from(random.slice(0, 5), (b) => ORDER_ALPHABET[b % ORDER_ALPHABET.length]).join("");
  return `VS-${ymd}-${suffix}`;
}

export type SubmitCode = "prescription_required" | "cart_changed" | "price_changed";

// The server's last word before saving: prescription first, then changed lines, then the total.
export function checkSubmit(
  quote: Quote,
  feeCentavos: number,
  expectedTotalCentavos: number,
): { ok: true; totalCentavos: number } | { ok: false; code: SubmitCode; totalCentavos: number } {
  const totalCentavos = (toCentavos(quote.subtotal) ?? 0) + feeCentavos;
  if (quote.lines.some((l) => l.requiresPrescription)) return { ok: false, code: "prescription_required", totalCentavos };
  if (quote.lines.some((l) => l.status === "out_of_stock" || l.status === "unavailable" || l.status === "adjusted")) {
    return { ok: false, code: "cart_changed", totalCentavos };
  }
  if (totalCentavos !== expectedTotalCentavos) return { ok: false, code: "price_changed", totalCentavos };
  return { ok: true, totalCentavos };
}
