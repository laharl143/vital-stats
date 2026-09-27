import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuote, toCentavos, type QuoteProduct } from "./cart-quote";
import type { OmsAvailability, OmsStock } from "./oms";

const product = (slug: string, over: Partial<QuoteProduct> = {}): QuoteProduct => ({
  slug,
  name: `TEST ${slug}`,
  price: "1299.90",
  currency: "PHP",
  isActive: true,
  requiresPrescription: false,
  imageUrl: null,
  ...over,
});
const oms = (rows: Record<string, Partial<OmsStock>>): OmsAvailability => ({
  ok: true,
  bySku: new Map(Object.entries(rows).map(([sku, s]) => [sku, { available: 5, price: "1299.90", currency: "PHP", ...s }])),
});
const down: OmsAvailability = { ok: false, reason: "network" };

test("toCentavos: plain decimals only, fraction padded or cut to 2 digits", () => {
  assert.equal(toCentavos("1299.9"), 129990);
  assert.equal(toCentavos("1299.90"), 129990);
  assert.equal(toCentavos("10"), 1000);
  assert.equal(toCentavos("0.005"), 0);
  for (const bad of ["-1", "abc", "", "1.2.3", "1e3", null]) assert.equal(toCentavos(bad), null, String(bad));
});

test("ok line: OMS price, exact centavo subtotal, no raw stock in the output", () => {
  const { quote, mismatched, unsellable } = buildQuote([{ slug: "a", qty: 3 }], [product("a")], oms({ a: { available: 7 } }));
  assert.equal(quote.subtotal, "3899.70");
  assert.equal(quote.omsChecked, true);
  assert.equal(quote.estimate, false);
  assert.deepEqual(quote.lines[0], {
    slug: "a", name: "TEST a", imageUrl: null, requiresPrescription: false,
    unitPrice: "1299.90", currency: "PHP", qty: 3, maxQty: 7, status: "ok", estimate: false,
  });
  assert.ok(!JSON.stringify(quote).includes("available"));
  assert.deepEqual(mismatched, []);
  assert.deepEqual(unsellable, []);
});

test("maxQty is the lower of stock and 10; above it the line is adjusted", () => {
  const { quote } = buildQuote(
    [{ slug: "a", qty: 10 }, { slug: "b", qty: 4 }],
    [product("a"), product("b")],
    oms({ a: { available: 3 }, b: { available: 50 } }),
  );
  assert.deepEqual([quote.lines[0].qty, quote.lines[0].maxQty, quote.lines[0].status], [3, 3, "adjusted"]);
  assert.deepEqual([quote.lines[1].qty, quote.lines[1].maxQty, quote.lines[1].status], [4, 10, "ok"]);
});

test("out of stock and negative stock: excluded from the subtotal, no price", () => {
  const { quote } = buildQuote(
    [{ slug: "a", qty: 1 }, { slug: "b", qty: 1 }, { slug: "c", qty: 1 }],
    [product("a"), product("b"), product("c", { price: "100" })],
    oms({ a: { available: 0 }, b: { available: -2 }, c: { price: "100.00" } }),
  );
  assert.equal(quote.lines[0].status, "out_of_stock");
  assert.equal(quote.lines[1].status, "out_of_stock");
  assert.equal(quote.lines[0].unitPrice, null);
  assert.equal(quote.subtotal, "100.00");
});

test("unavailable: every cause, unsellable OMS slugs reported", () => {
  const { quote, unsellable } = buildQuote(
    ["missing", "inactive", "noprice", "usd", "notinoms", "omsnoprice", "omsusd"].map((slug) => ({ slug, qty: 1 })),
    [
      product("inactive", { isActive: false }),
      product("noprice", { price: null }),
      product("usd", { currency: "USD" }),
      product("notinoms"),
      product("omsnoprice"),
      product("omsusd"),
    ],
    oms({ omsnoprice: { price: null }, omsusd: { currency: "USD" }, inactive: {}, noprice: {}, usd: {} }),
  );
  assert.ok(quote.lines.every((l) => l.status === "unavailable" && l.maxQty === 0 && l.unitPrice === null));
  assert.equal(quote.lines[0].name, null);
  assert.equal(quote.subtotal, "0.00");
  assert.deepEqual(unsellable, ["notinoms", "omsnoprice", "omsusd"]);
});

test("price mismatch compares centavos, not strings", () => {
  const same = buildQuote([{ slug: "a", qty: 1 }], [product("a", { price: "10" })], oms({ a: { price: "10.00" } }));
  assert.deepEqual(same.mismatched, []);
  const diff = buildQuote([{ slug: "a", qty: 1 }], [product("a", { price: "10" })], oms({ a: { price: "12.00" } }));
  assert.deepEqual(diff.mismatched, ["a"]);
  assert.equal(diff.quote.lines[0].unitPrice, "12.00", "the cart shows the OMS price");
});

test("OMS down: storefront price as an estimate, maxQty 10", () => {
  const { quote } = buildQuote([{ slug: "a", qty: 2 }, { slug: "x", qty: 1 }], [product("a", { price: "299.5" })], down);
  assert.equal(quote.omsChecked, false);
  assert.equal(quote.estimate, true);
  assert.deepEqual([quote.lines[0].status, quote.lines[0].unitPrice, quote.lines[0].maxQty, quote.lines[0].estimate], ["unchecked", "299.50", 10, true]);
  assert.equal(quote.lines[1].status, "unavailable");
  assert.equal(quote.subtotal, "599.00");
});
