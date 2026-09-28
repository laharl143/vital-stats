/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

// Spec 0003: POST /api/checkout runs for real against a fake database, a fake OMS and a fake admin
// email. Nothing here reaches the real database, the live OMS or Resend.

type Product = {
  id: string; slug: string; name: string; price: { toString(): string } | null; currency: string;
  isActive: boolean; requiresPrescription: boolean; images: { url: string }[];
};
type Row = Record<string, unknown> & { orderNumber: string; checkoutKey: string | null; totalAmount: unknown };
type OmsReply = { status: number; json: unknown } | "network-error";

let products: Product[];
let orders: Row[];
let omsReply: OmsReply;
let emails: Record<string, unknown>[];
let createCalls: number;
let numberAlwaysClashes: boolean;
let dbFails: boolean;
let logs: string[];

const decimal = (s: string) => ({ toString: () => s, toFixed: (n: number) => Number(s).toFixed(n) });
const product = (slug: string, over: Partial<Product> = {}): Product => ({
  id: `id-${slug}`, slug, name: `TEST ${slug}`, price: decimal("150"), currency: "PHP",
  isActive: true, requiresPrescription: false, images: [], ...over,
});
const p2002 = () => Object.assign(new Error("Unique constraint failed on data { customerName: 'TEST Juan' }"), { code: "P2002" });

const fakePrisma = {
  product: {
    findMany: async (args: { where: { slug: { in: string[] } } }) => {
      if (dbFails) throw new Error("db down, query had TEST Juan Dela Cruz");
      return products.filter((p) => args.where.slug.in.includes(p.slug));
    },
  },
  order: {
    findUnique: async ({ where }: { where: { checkoutKey: string } }) => {
      const row = orders.find((o) => o.checkoutKey === where.checkoutKey);
      return row
        ? { orderNumber: row.orderNumber, totalAmount: decimal(String(row.totalAmount)), paymentMethod: row.paymentMethod, statusToken: row.statusToken }
        : null;
    },
    // Lazy expiry of abandoned online payments (spec 0004); COD tests never have one.
    findMany: async () => [],
    count: async ({ where }: { where: { source: string; ipAddress: string; createdAt: { gte: Date } } }) =>
      orders.filter((o) => o.source === where.source && o.ipAddress === where.ipAddress && (o.createdAt as Date) >= where.createdAt.gte).length,
    create: async ({ data }: { data: Row }) => {
      createCalls++;
      await new Promise((r) => setImmediate(r)); // let a racing request reach this point too
      if (numberAlwaysClashes) throw p2002();
      if (orders.some((o) => o.checkoutKey === data.checkoutKey || o.orderNumber === data.orderNumber)) throw p2002();
      orders.push({ ...data, createdAt: new Date() });
      return { id: `ord-${orders.length}`, orderNumber: data.orderNumber, statusToken: data.statusToken };
    },
  },
};
require.cache[require.resolve("./prisma")] = {
  id: "prisma", filename: "prisma", loaded: true, exports: { prisma: fakePrisma },
} as unknown as NodeModule;
require.cache[require.resolve("./notify-admin")] = {
  id: "notify-admin", filename: "notify-admin", loaded: true,
  exports: { notifyAdmin: async (n: Record<string, unknown>) => { emails.push(n); } },
} as unknown as NodeModule;

globalThis.fetch = (async () => {
  if (omsReply === "network-error") throw new TypeError("fetch failed");
  return new Response(JSON.stringify(omsReply.json), { status: omsReply.status, headers: { "X-Total-Count": "1" } });
}) as unknown as typeof fetch;
for (const level of ["info", "warn", "error"] as const) {
  console[level] = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
}

// after() needs a live request in Next; here it runs the callback at once. The customer email
// module (spec 0005) is faked to record what each route asked for.
require("next/server").after = (fn: () => unknown) => { void fn(); };
const customerEmails: string[] = [];
require.cache[require.resolve("./notify-customer")] = {
  id: "notify-customer", filename: "notify-customer", loaded: true,
  exports: {
    emailCustomer: async (orderId: string, kind: string) => { customerEmails.push(`${orderId}:${kind}`); return "sent"; },
    emailForStatus: async (orderId: string, status: string) => { customerEmails.push(`${orderId}:status:${status}`); return "sent"; },
  },
} as unknown as NodeModule;
const { POST } = require("../app/api/checkout/route") as { POST: (req: NextRequest) => Promise<Response> };
const { clearAvailabilityCache, getAvailability } = require("./oms") as {
  clearAvailabilityCache: () => void;
  getAvailability: (o: { baseUrl?: string; apiKey?: string }) => Promise<{ ok: boolean }>;
};

const KEY = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
const body = (over: Record<string, unknown> = {}) => ({
  checkoutKey: KEY,
  items: [{ slug: "lumela-soap", qty: 2 }],
  customer: { name: "TEST Juan Dela Cruz", phone: "0917 123 4567", email: "Test.Buyer@Example.com" },
  address: { street: "Unit 5B 123 Rizal St", barangay: "San Isidro", city: "Makati City", province: "Metro Manila", postalCode: "1200" },
  notes: "Green gate",
  paymentMethod: "cod",
  expectedTotal: "400.00",
  privacyConsent: true,
  ...over,
});
const post = async (b: unknown, ip = "203.0.113.7") => {
  const res = await POST(new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof b === "string" ? b : JSON.stringify(b),
  }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> & { data?: { orderNumber: string; total: string } } };
};
const PII = ["Juan", "917", "Example.com", "example.com", "Rizal", "San Isidro", "Green gate"];

beforeEach(() => {
  clearAvailabilityCache();
  process.env.OMS_BASE_URL = "https://oms.test/api/v1";
  process.env.OMS_API_KEY = "test-secret-key";
  products = [product("lumela-soap"), product("rx-cream", { requiresPrescription: true })];
  orders = [];
  omsReply = {
    status: 200,
    json: [
      { sku: "lumela-soap", available: 5, price: "150.00", currency: "PHP" },
      { sku: "rx-cream", available: 5, price: "720.50", currency: "PHP" },
    ],
  };
  emails = [];
  createCalls = 0;
  numberAlwaysClashes = false;
  dbFails = false;
  logs = [];
  customerEmails.length = 0;
});

test("happy path: saves one pending COD storefront order with fee, consent and items (AC-9, AC-18)", async () => {
  const { status, json } = await post(body());

  assert.equal(status, 201);
  assert.match(json.data!.orderNumber, /^VS-\d{6}-[2-9A-HJKMNP-Z]{5}$/);
  assert.equal(json.data!.total, "400.00");
  assert.equal(orders.length, 1);
  const o = orders[0];
  assert.equal(o.source, "STOREFRONT");
  assert.equal(o.status, "PENDING");
  assert.equal(o.paymentMethod, "COD");
  assert.equal(o.customerName, "TEST Juan Dela Cruz");
  assert.equal(o.customerContact, "+639171234567");
  assert.equal(o.customerEmail, "test.buyer@example.com");
  assert.equal(o.customerAddress, "Unit 5B 123 Rizal St, San Isidro, Makati City, Metro Manila 1200");
  assert.equal(o.notes, "Green gate");
  assert.equal(o.shippingFee, "100.00");
  assert.equal(o.totalAmount, "400.00");
  assert.equal(o.stockUnchecked, false);
  assert.equal(o.checkoutKey, KEY);
  assert.equal(o.ipAddress, "203.0.113.7");
  assert.equal(o.privacyVersion, "2026-09-26");
  assert.equal(o.termsVersion, "2026-09-26");
  assert.ok(o.consentedAt instanceof Date);
  assert.deepEqual(o.items, { create: [{ productId: "id-lumela-soap", productName: "TEST lumela-soap", quantity: 2, unitPrice: "150.00" }] });
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0], {
    kind: "order", orderNumber: json.data!.orderNumber, customerName: "TEST Juan Dela Cruz",
    phone: "+639171234567", itemCount: 2, total: "₱400.00",
  });
});

test("provincial address pays the 180 fee (AC-6)", async () => {
  const { status, json } = await post(body({
    address: { street: "1 Osmeña Blvd", barangay: "Kamputhaw", city: "Cebu City", province: "Cebu", postalCode: "6000" },
    expectedTotal: "480.00",
  }));
  assert.equal(status, 201);
  assert.equal(json.data!.total, "480.00");
  assert.equal(orders[0].shippingFee, "180.00");
});

test("no consent, false, or the string true: 400 and nothing saved or sent (AC-8)", async () => {
  for (const privacyConsent of [undefined, false, "true", "on", 1]) {
    const { status, json } = await post(body({ privacyConsent }));
    assert.equal(status, 400, String(privacyConsent));
    assert.equal(json.error, "Please agree to the Privacy Notice to continue.");
  }
  assert.equal(orders.length, 0);
  assert.equal(emails.length, 0);
});

test("malformed bodies are refused with 400 (AC-7, AC-16)", async () => {
  for (const b of ["{", body({ paymentMethod: "prepaid" }), body({ items: [] }), body({ checkoutKey: "x" }), body({ expectedTotal: "abc" })]) {
    const { status } = await post(b);
    assert.equal(status, 400);
  }
  assert.equal(orders.length, 0);
});

test("the same key sent twice creates one order and one email (AC-15, AC-18)", async () => {
  const first = await post(body());
  const second = await post(body());
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.deepEqual(second.json.data, first.json.data);
  assert.equal(orders.length, 1);
  assert.equal(emails.length, 1);
  // Spec 0005: the reply carries the status page token, and only the first save emails the customer.
  assert.match(String((first.json.data as Record<string, unknown>).statusToken), /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(customerEmails, ["ord-1:RECEIVED"]);
});

test("two racing requests with one key: the unique index keeps one order (AC-15)", async () => {
  const [a, b] = await Promise.all([post(body()), post(body())]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal(a.json.data!.orderNumber, b.json.data!.orderNumber);
  assert.equal(orders.length, 1);
  assert.equal(emails.length, 1);
});

test("a 6th order from one IP in an hour gets 429 and saves nothing (AC-17)", async () => {
  for (let i = 0; i < 5; i++) {
    orders.push({ orderNumber: `old-${i}`, checkoutKey: null, totalAmount: "1", source: "STOREFRONT", ipAddress: "203.0.113.7", createdAt: new Date() });
  }
  const { status, json } = await post(body());
  assert.equal(status, 429);
  assert.match(String(json.error), /Too many orders/);
  assert.equal(orders.length, 5);
  assert.equal((await post(body(), "198.51.100.9")).status, 201); // another IP is fine
});

test("a prescription product is refused with 422 before anything is saved (AC-14)", async () => {
  const { status, json } = await post(body({ items: [{ slug: "lumela-soap", qty: 1 }, { slug: "rx-cream", qty: 1 }] }));
  assert.equal(status, 422);
  assert.equal(json.code, "prescription_required");
  assert.equal(orders.length, 0);
});

test("a line that sold down or out since the page loaded gets cart_changed with the fresh quote (AC-11)", async () => {
  omsReply = { status: 200, json: [{ sku: "lumela-soap", available: 1, price: "150.00", currency: "PHP" }] };
  const lowered = await post(body());
  assert.equal(lowered.status, 409);
  assert.equal(lowered.json.code, "cart_changed");
  const line = (lowered.json.quote as { lines: { status: string; qty: number }[] }).lines[0];
  assert.deepEqual([line.status, line.qty], ["adjusted", 1]);

  omsReply = { status: 200, json: [{ sku: "lumela-soap", available: 0, price: "150.00", currency: "PHP" }] };
  assert.equal((await post(body())).json.code, "cart_changed");
  assert.equal(orders.length, 0);
});

test("a total that differs by one centavo gets price_changed with the new total (AC-12)", async () => {
  const { status, json } = await post(body({ expectedTotal: "399.99" }));
  assert.equal(status, 409);
  assert.equal(json.code, "price_changed");
  assert.equal(json.total, "400.00");
  assert.equal(orders.length, 0);
});

test("OMS down: the order still saves, priced from the catalog and flagged unchecked (AC-13)", async () => {
  omsReply = "network-error";
  const { status } = await post(body());
  assert.equal(status, 201);
  assert.equal(orders[0].stockUnchecked, true);
  assert.equal(orders[0].totalAmount, "400.00");

  products = [product("lumela-soap", { price: null })];
  const unpriced = await post(body({ checkoutKey: "11111111-2222-4333-8444-555555555555" }));
  assert.equal(unpriced.json.code, "cart_changed");
});

test("three order number clashes in a row answer 500 and save nothing", async () => {
  numberAlwaysClashes = true;
  const { status } = await post(body());
  assert.equal(status, 500);
  assert.equal(createCalls, 3);
  assert.equal(orders.length, 0);
  assert.ok(logs.some((l) => l.includes("order_number_exhausted")));
});

test("a database failure answers 500 without logging the error text (AC-21)", async () => {
  dbFails = true;
  assert.equal((await post(body())).status, 500);
  assert.ok(logs.some((l) => l.startsWith("[POST /api/checkout]")));
});

test("logs never carry the customer's name, phone, email, address or notes (AC-21)", async () => {
  await post(body());
  await post(body());
  await post(body({ checkoutKey: "11111111-2222-4333-8444-555555555555", expectedTotal: "1.00" }));
  numberAlwaysClashes = true;
  await post(body({ checkoutKey: "11111111-2222-4333-8444-666666666666" }));
  numberAlwaysClashes = false;
  dbFails = true;
  await post(body({ checkoutKey: "11111111-2222-4333-8444-777777777777" }));
  assert.ok(logs.length > 0);
  for (const l of logs) for (const bit of PII) assert.ok(!l.includes(bit), `${bit} leaked in: ${l}`);
});

test("submit asks the OMS fresh even when the cart's 30 second cache is warm (AC-11, verify regression)", async () => {
  // A cart view a moment ago cached stock 5; the OMS now says 1.
  assert.ok((await getAvailability({ baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY })).ok);
  omsReply = { status: 200, json: [{ sku: "lumela-soap", available: 1, price: "150.00", currency: "PHP" }] };
  const { status, json } = await post(body());
  assert.equal(status, 409);
  assert.equal(json.code, "cart_changed");
  assert.equal(orders.length, 0);
});

test("OMS down at submit is unchecked even when the cache holds a good answer (AC-13, verify regression)", async () => {
  assert.ok((await getAvailability({ baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY })).ok);
  omsReply = "network-error";
  const { status } = await post(body());
  assert.equal(status, 201);
  assert.equal(orders[0].stockUnchecked, true);
});
