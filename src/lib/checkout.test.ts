import assert from "node:assert/strict";
import { test } from "node:test";
import {
  METRO_MANILA, PROVINCES, checkSubmit, deliveryFeeCentavos, joinAddress, makeOrderNumber,
  normalizeMobile, parseCheckout, validateCheckoutFields, type CheckoutFields,
} from "./checkout";
import type { Quote, QuoteLine } from "./cart-quote";

// Spec 0003 checkout rules. Pure, no database or network.

const fields = (over: Partial<CheckoutFields> = {}): CheckoutFields => ({
  name: "TEST Juan Dela Cruz", phone: "0917 123 4567", email: "Test@Example.com",
  street: "Unit 5B 123 Rizal St", barangay: "San Isidro", city: "Makati City",
  province: METRO_MANILA, postalCode: "1200", notes: "", ...over,
});
const body = (over: Record<string, unknown> = {}) => {
  const f = fields();
  return {
    checkoutKey: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
    items: [{ slug: "lumela-soap", qty: 2 }],
    customer: { name: f.name, phone: f.phone, email: f.email },
    address: { street: f.street, barangay: f.barangay, city: f.city, province: f.province, postalCode: f.postalCode },
    notes: "",
    paymentMethod: "cod",
    expectedTotal: "400.00",
    ...over,
  };
};
const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  slug: "lumela-soap", name: "TEST soap", imageUrl: null, requiresPrescription: false,
  unitPrice: "150.00", currency: "PHP", qty: 2, maxQty: 10, status: "ok", estimate: false, ...over,
});
const quote = (lines: QuoteLine[], subtotal = "300.00"): Quote => ({ lines, subtotal, currency: "PHP", estimate: false, omsChecked: true });

test("normalizeMobile accepts the four Philippine mobile forms (AC-5)", () => {
  for (const raw of ["09171234567", "9171234567", "639171234567", "+639171234567", "+63 (917) 123-4567", "0917 123 4567"]) {
    assert.equal(normalizeMobile(raw), "+639171234567", raw);
  }
});

test("normalizeMobile refuses landlines, wrong lengths and letters (AC-5)", () => {
  for (const raw of ["0288123456", "8171234567", "091712345678", "0917123456", "+9171234567", "0917abc4567", ""]) {
    assert.equal(normalizeMobile(raw), null, raw);
  }
});

test("delivery fee: Metro Manila 100, any listed province 180, unknown none (AC-6)", () => {
  assert.equal(deliveryFeeCentavos(METRO_MANILA), 10000);
  assert.equal(deliveryFeeCentavos("Cebu"), 18000);
  assert.equal(deliveryFeeCentavos("Tawi-Tawi"), 18000);
  assert.equal(deliveryFeeCentavos("Atlantis"), null);
  assert.equal(deliveryFeeCentavos(""), null);
});

test("province list: Metro Manila first, then 82 provinces in order (AC-4)", () => {
  assert.equal(PROVINCES[0], METRO_MANILA);
  const rest = PROVINCES.slice(1);
  assert.equal(rest.length, 82);
  assert.deepEqual(rest, [...rest].sort((a, b) => a.localeCompare(b, "en")));
  assert.equal(new Set(PROVINCES).size, PROVINCES.length);
});

test("validateCheckoutFields passes a good form and flags each bad field in form order (AC-4)", () => {
  assert.deepEqual(validateCheckoutFields(fields()), {});
  const errors = validateCheckoutFields(fields({
    name: " J ", phone: "123", email: "a@b", street: "", barangay: "x".repeat(101), city: "  ",
    province: "Atlantis", postalCode: "12345", notes: "x".repeat(301),
  }));
  assert.deepEqual(Object.keys(errors), ["name", "phone", "email", "street", "barangay", "city", "province", "postalCode", "notes"]);
});

test("email rule: one @, text on both sides, a dot in the domain, at most 254 (AC-4)", () => {
  assert.equal(validateCheckoutFields(fields({ email: "a@b.co" })).email, undefined);
  for (const email of ["ab.co", "@b.co", "a@", "a@b", "a@@b.co", "a b@c.co", `${"x".repeat(250)}@b.co`]) {
    assert.ok(validateCheckoutFields(fields({ email })).email, email);
  }
});

test("joinAddress builds the one line address the OMS gets", () => {
  assert.equal(joinAddress(fields({ street: " Unit 5B 123 Rizal St " })), "Unit 5B 123 Rizal St, San Isidro, Makati City, Metro Manila 1200");
});

test("parseCheckout normalizes a good body (AC-9)", () => {
  const r = parseCheckout(body({ notes: "  Gate is green  " }));
  assert.ok(r.ok);
  assert.equal(r.value.phone, "+639171234567");
  assert.equal(r.value.email, "test@example.com");
  assert.equal(r.value.notes, "Gate is green");
  assert.equal(r.value.expectedTotalCentavos, 40000);
  const empty = parseCheckout(body({ notes: "   " }));
  assert.ok(empty.ok && empty.value.notes === null);
});

test("parseCheckout refuses each malformed input (AC-7, AC-16)", () => {
  const bad: Record<string, unknown>[] = [
    { checkoutKey: "not-a-uuid" },
    { checkoutKey: undefined },
    { items: [] },
    { items: "x" },
    { items: Array.from({ length: 21 }, (_, i) => ({ slug: `p${i}`, qty: 1 })) },
    { items: [{ slug: "a", qty: 0 }] },
    { items: [{ slug: "a", qty: 1.5 }] },
    { items: [{ slug: 5, qty: 1 }] },
    { customer: { name: "TEST", phone: "123", email: "a@b.co" } },
    { address: { street: "x", barangay: "x", city: "x", province: "Atlantis", postalCode: "1200" } },
    { paymentMethod: "prepaid" },
    { paymentMethod: undefined },
    { expectedTotal: 400 },
    { expectedTotal: "4OO" },
    { expectedTotal: "400.001" },
    { expectedTotal: "-1" },
  ];
  for (const over of bad) assert.equal(parseCheckout(body(over)).ok, false, JSON.stringify(over));
  assert.equal(parseCheckout(null).ok, false);
});

test("makeOrderNumber uses the Manila date and a readable 5 character suffix", () => {
  const random = new Uint8Array([0, 1, 30, 31, 255]);
  // 15:59 UTC is 23:59 in Manila; 16:00 UTC is already the next day there.
  assert.equal(makeOrderNumber(new Date("2026-09-27T15:59:00Z"), random), "VS-260927-23Z29");
  assert.equal(makeOrderNumber(new Date("2026-09-27T16:00:00Z"), random), "VS-260928-23Z29");
  assert.match(makeOrderNumber(new Date(), crypto.getRandomValues(new Uint8Array(5))), /^VS-\d{6}-[2-9A-HJKMNP-Z]{5}$/);
});

test("checkSubmit: prescription wins over changed lines, which win over price (AC-11, AC-12, AC-14)", () => {
  const rx = line({ slug: "rx", requiresPrescription: true });
  assert.deepEqual(checkSubmit(quote([line({ status: "out_of_stock" }), rx]), 10000, 1), { ok: false, code: "prescription_required", totalCentavos: 40000 });
  for (const status of ["out_of_stock", "unavailable", "adjusted"] as const) {
    assert.equal(checkSubmit(quote([line({ status })]), 10000, 1).ok, false, status);
    const r = checkSubmit(quote([line({ status })]), 10000, 40000);
    assert.ok(!r.ok && r.code === "cart_changed");
  }
  assert.deepEqual(checkSubmit(quote([line()]), 10000, 39999), { ok: false, code: "price_changed", totalCentavos: 40000 });
  assert.deepEqual(checkSubmit(quote([line()]), 10000, 40000), { ok: true, totalCentavos: 40000 });
  assert.deepEqual(checkSubmit(quote([line({ status: "unchecked", estimate: true })]), 18000, 48000), { ok: true, totalCentavos: 48000 });
});
