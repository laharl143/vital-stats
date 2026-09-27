import assert from "node:assert/strict";
import { test } from "node:test";
import { addItem, cartCount, parseCart, removeItem, serializeCart, setQty } from "./cart";

const cart = (items: unknown) => JSON.stringify({ v: 1, items });

test("parseCart: round trips a valid cart and stores only v, slug and qty (covers AC-5)", () => {
  const items = [{ slug: "lumela-soap", qty: 2 }, { slug: "nad-plus", qty: 1 }];
  assert.deepEqual(parseCart(serializeCart(items)), items);
  assert.equal(serializeCart(items), '{"v":1,"items":[{"slug":"lumela-soap","qty":2},{"slug":"nad-plus","qty":1}]}');
});

test("parseCart: anything unexpected reads as empty (covers AC-16)", () => {
  for (const raw of [
    null,
    "",
    "{",
    "[]",
    JSON.stringify({ v: 2, items: [] }),
    cart([{ slug: "a", qty: 0 }]),
    cart([{ slug: "a", qty: -1 }]),
    cart([{ slug: "a", qty: 1.5 }]),
    cart([{ slug: "a", qty: 11 }]),
    cart([{ slug: "", qty: 1 }]),
    cart([{ slug: 5, qty: 1 }]),
    cart([{ slug: "a", qty: 1 }, { slug: "a", qty: 2 }]),
    cart([null]),
    JSON.stringify({ v: 1 }),
    JSON.stringify({ v: 1, items: {} }),
    cart([{ slug: "x".repeat(101), qty: 1 }]),
    cart(Array.from({ length: 21 }, (_, i) => ({ slug: `p${i}`, qty: 1 }))),
  ]) {
    assert.deepEqual(parseCart(raw), [], String(raw));
  }
});

test("addItem: merges and caps at maxQty and at 10 (covers AC-2)", () => {
  let items = addItem([], "a", 2, 3);
  assert.deepEqual(items, [{ slug: "a", qty: 2 }]);
  items = addItem(items, "a", 5, 3);
  assert.deepEqual(items, [{ slug: "a", qty: 3 }]);
  assert.equal(addItem(items, "a", 1, 3), items, "already at the cap: same array");
  assert.deepEqual(addItem([], "b", 50, 99), [{ slug: "b", qty: 10 }]);
  assert.deepEqual(addItem([], "c", 1, 0), [], "maxQty 0 adds nothing");
});

test("addItem: never a 21st line", () => {
  const full = Array.from({ length: 20 }, (_, i) => ({ slug: `p${i}`, qty: 1 }));
  assert.equal(addItem(full, "new", 1, 10), full);
  assert.deepEqual(addItem(full, "p0", 1, 10)[0], { slug: "p0", qty: 2 });
});

test("setQty and removeItem: same array when nothing changes", () => {
  const items = [{ slug: "a", qty: 2 }];
  assert.equal(setQty(items, "a", 2), items);
  assert.equal(setQty(items, "a", 0), items);
  assert.equal(setQty(items, "missing", 3), items);
  assert.deepEqual(setQty(items, "a", 4), [{ slug: "a", qty: 4 }]);
  assert.equal(removeItem(items, "missing"), items);
  assert.deepEqual(removeItem(items, "a"), []);
});

test("cartCount sums quantities", () => {
  assert.equal(cartCount([{ slug: "a", qty: 2 }, { slug: "b", qty: 3 }]), 5);
  assert.equal(cartCount([]), 0);
});

test("addItem: a zero quantity adds nothing", () => {
  assert.deepEqual(addItem([], "a", 0, 10), []);
});
