/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

// Spec 0002: POST /api/cart/quote runs for real against a fake product table and a fake OMS.
// Nothing here reaches the database or the live OMS.

type Product = {
  slug: string; name: string; price: { toString(): string } | null; currency: string;
  isActive: boolean; requiresPrescription: boolean; images: { url: string }[];
};
type OmsReply = { status: number; json: unknown } | "network-error";

let products: Product[];
let findManyCalls: { where: { slug: { in: string[] } } }[];
let dbFails: boolean;
let omsReply: OmsReply;
let omsCalls: { url: string; auth: string | undefined }[];
let warnings: string[];
let errors: unknown[][];

const decimal = (s: string) => ({ toString: () => s }); // what Prisma hands back for Decimal
const product = (slug: string, over: Partial<Product> = {}): Product => ({
  slug, name: `TEST ${slug}`, price: decimal("150"), currency: "PHP",
  isActive: true, requiresPrescription: false, images: [], ...over,
});

const fakePrisma = {
  product: {
    findMany: async (args: { where: { slug: { in: string[] } } }) => {
      findManyCalls.push(args);
      if (dbFails) throw new Error("db down");
      return products.filter((p) => args.where.slug.in.includes(p.slug));
    },
  },
};
require.cache[require.resolve("./prisma")] = {
  id: "prisma", filename: "prisma", loaded: true, exports: { prisma: fakePrisma },
} as unknown as NodeModule;

globalThis.fetch = (async (url: string, init: { headers: Record<string, string> }) => {
  omsCalls.push({ url, auth: init.headers.Authorization });
  if (omsReply === "network-error") throw new TypeError("fetch failed");
  return new Response(JSON.stringify(omsReply.json), { status: omsReply.status, headers: { "X-Total-Count": "1" } });
}) as unknown as typeof fetch;
console.warn = (msg: string) => { warnings.push(msg); };
console.error = (...args: unknown[]) => { errors.push(args); };

const { POST } = require("../app/api/cart/quote/route") as { POST: (req: NextRequest) => Promise<Response> };
const { clearAvailabilityCache } = require("./oms") as { clearAvailabilityCache: () => void };

const quote = async (body: unknown) => {
  const res = await POST(new NextRequest("http://localhost/api/cart/quote", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  }));
  return { status: res.status, json: (await res.json()) as { data?: Record<string, unknown> & { lines: Record<string, unknown>[] }; error?: string } };
};
const omsRows = (rows: unknown[]): OmsReply => ({ status: 200, json: rows });

beforeEach(() => {
  clearAvailabilityCache(); // each test sets its own OMS reply
  process.env.OMS_BASE_URL = "https://oms.test/api/v1";
  process.env.OMS_API_KEY = "test-secret-key";
  products = [product("lumela-soap"), product("rx-cream", { requiresPrescription: true, price: decimal("720.5") })];
  findManyCalls = [];
  dbFails = false;
  omsReply = omsRows([
    { sku: "lumela-soap", available: 3, price: "150.00", currency: "PHP" },
    { sku: "rx-cream", available: 50, price: "720.50", currency: "PHP" },
  ]);
  omsCalls = [];
  warnings = [];
  errors = [];
});

test("happy path: OMS prices, capped quantities and an exact subtotal (covers AC-7, AC-8)", async () => {
  const { status, json } = await quote({ items: [{ slug: "lumela-soap", qty: 2 }, { slug: "rx-cream", qty: 3 }] });

  assert.equal(status, 200);
  assert.equal(json.data?.subtotal, "2461.50");
  assert.equal(json.data?.omsChecked, true);
  assert.deepEqual(json.data?.lines.map((l) => [l.slug, l.status, l.unitPrice, l.qty, l.maxQty, l.requiresPrescription]), [
    ["lumela-soap", "ok", "150.00", 2, 3, false],
    ["rx-cream", "ok", "720.50", 3, 10, true],
  ]);
  assert.equal(omsCalls[0].auth, "Bearer test-secret-key");
});

test("never leaks the raw OMS stock or the OMS key (covers AC-14)", async () => {
  const { json } = await quote({ items: [{ slug: "lumela-soap", qty: 1 }] });
  const body = JSON.stringify(json);

  assert.ok(!json.data?.lines.some((l) => "available" in l));
  assert.ok(!body.includes("test-secret-key"));
});

test("a quantity above stock comes back lowered and adjusted (covers AC-9)", async () => {
  const { json } = await quote({ items: [{ slug: "lumela-soap", qty: 10 }] });

  assert.deepEqual([json.data?.lines[0].qty, json.data?.lines[0].status], [3, "adjusted"]);
});

test("malformed bodies are refused with 400 before any lookup (covers AC-14)", async () => {
  const bad: unknown[] = [
    "{",
    {},
    { items: "nope" },
    { items: Array.from({ length: 21 }, (_, i) => ({ slug: `p${i}`, qty: 1 })) },
    { items: [{ slug: "a", qty: 0 }] },
    { items: [{ slug: "a", qty: 11 }] },
    { items: [{ slug: "a", qty: 1.5 }] },
    { items: [{ slug: "a", qty: "2" }] },
    { items: [{ slug: 5, qty: 1 }] },
    { items: [{ slug: "", qty: 1 }] },
    { items: [{ slug: "x".repeat(101), qty: 1 }] },
    { items: [null] },
  ];
  for (const body of bad) {
    const { status, json } = await quote(body);
    assert.equal(status, 400, JSON.stringify(body).slice(0, 60));
    assert.equal(typeof json.error, "string");
  }
  assert.equal(findManyCalls.length, 0);
  assert.equal(omsCalls.length, 0);
});

test("an odd but valid slug is looked up and comes back unavailable (covers AC-14)", async () => {
  const { status, json } = await quote({ items: [{ slug: "../x", qty: 1 }] });

  assert.equal(status, 200);
  assert.deepEqual([json.data?.lines[0].status, json.data?.lines[0].name], ["unavailable", null]);
});

test("duplicate slugs merge into one line capped at 10, one database read", async () => {
  omsReply = omsRows([{ sku: "lumela-soap", available: 50, price: "150.00", currency: "PHP" }]);
  const { json } = await quote({ items: [{ slug: "lumela-soap", qty: 7 }, { slug: "lumela-soap", qty: 7 }] });

  assert.deepEqual(json.data?.lines.map((l) => [l.slug, l.qty]), [["lumela-soap", 10]]);
  assert.equal(findManyCalls.length, 1);
  assert.deepEqual(findManyCalls[0].where.slug.in, ["lumela-soap"]);
});

test("an empty cart touches neither the database nor the OMS", async () => {
  const { status, json } = await quote({ items: [] });

  assert.equal(status, 200);
  assert.deepEqual(json.data?.lines, []);
  assert.equal(findManyCalls.length, 0);
  assert.equal(omsCalls.length, 0);
});

test("OMS unreachable: storefront prices as an estimate (covers AC-10)", async () => {
  omsReply = "network-error";
  const { status, json } = await quote({ items: [{ slug: "lumela-soap", qty: 2 }] });

  assert.equal(status, 200);
  assert.equal(json.data?.omsChecked, false);
  assert.equal(json.data?.estimate, true);
  assert.deepEqual([json.data?.lines[0].status, json.data?.lines[0].unitPrice, json.data?.lines[0].maxQty], ["unchecked", "150.00", 10]);
  assert.ok(warnings.some((w) => w.includes("OMS availability unavailable: network")));
});

test("OMS not configured behaves like OMS down, with no OMS call (covers AC-10)", async () => {
  delete process.env.OMS_BASE_URL;
  const { json } = await quote({ items: [{ slug: "lumela-soap", qty: 1 }] });

  assert.equal(json.data?.lines[0].status, "unchecked");
  assert.equal(omsCalls.length, 0);
});

test("OMS refuses the key: treated as unchecked, not a crash (covers AC-10)", async () => {
  omsReply = { status: 401, json: { error: "unauthorized" } };
  const { status, json } = await quote({ items: [{ slug: "lumela-soap", qty: 1 }] });

  assert.equal(status, 200);
  assert.equal(json.data?.lines[0].status, "unchecked");
});

test("price mismatches and unsellable products are logged by slug only (covers AC-4, AC-8)", async () => {
  products.push(product("lotion", { price: decimal("290") }), product("toner"));
  omsReply = omsRows([
    { sku: "lumela-soap", available: 3, price: "150.00", currency: "PHP" }, // "150" vs "150.00": same price
    { sku: "lotion", available: 5, price: "300.00", currency: "PHP" },
  ]);
  const { json } = await quote({ items: ["lumela-soap", "lotion", "toner"].map((slug) => ({ slug, qty: 1 })) });

  assert.deepEqual(json.data?.lines.map((l) => [l.slug, l.status, l.unitPrice]), [
    ["lumela-soap", "ok", "150.00"],
    ["lotion", "ok", "300.00"],
    ["toner", "unavailable", null],
  ]);
  assert.deepEqual(warnings, [
    "[POST /api/cart/quote] storefront and OMS prices differ for lotion",
    "[POST /api/cart/quote] not sellable in the OMS (unlisted or no price): toner",
  ]);
});

test("a database failure answers 500 with a plain error and logs it", async () => {
  dbFails = true;
  const { status, json } = await quote({ items: [{ slug: "lumela-soap", qty: 1 }] });

  assert.equal(status, 500);
  assert.equal(json.error, "Failed to load the cart");
  assert.equal(errors[0][0], "[POST /api/cart/quote]");
});
