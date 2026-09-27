/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

// Spec 0003, AC-20: POST /api/orders/[id]/confirm sends a storefront order to the OMS with the
// payment method the customer chose at checkout and its delivery fee, and sends an admin created
// order exactly as before. Runs for real against a fake database, a fake admin session and a fake OMS.

type Order = {
  id: string; orderNumber: string; status: string; customerName: string; customerContact: string;
  customerAddress: string | null; paymentMethod: "COD" | "PREPAID" | null; shippingFee: { toFixed(n: number): string };
  items: { quantity: number; product: { slug: string; requiresPrescription: boolean } }[];
};

let orders: Order[];
let signedIn: boolean;
let omsBodies: Record<string, unknown>[];
let updates: number;

const decimal = (s: string) => ({ toFixed: (n: number) => Number(s).toFixed(n), toString: () => s });
const order = (over: Partial<Order> = {}): Order => ({
  id: "ord-1", orderNumber: "VS-260927-TEST1", status: "PENDING", customerName: "TEST Buyer",
  customerContact: "+639170000000", customerAddress: "TEST 1 Sample St, Makati City, Metro Manila 1200",
  paymentMethod: "COD", shippingFee: decimal("100"),
  items: [{ quantity: 2, product: { slug: "lumela-soap", requiresPrescription: false } }],
  ...over,
});

const fakePrisma = {
  order: {
    findUnique: async ({ where }: { where: { id: string } }) => orders.find((o) => o.id === where.id) ?? null,
    updateMany: async ({ where, data }: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
      const o = orders.find((x) => x.id === where.id && x.status === where.status);
      if (!o) return { count: 0 };
      Object.assign(o, data);
      updates++;
      return { count: 1 };
    },
  },
};
require.cache[require.resolve("./prisma")] = {
  id: "prisma", filename: "prisma", loaded: true, exports: { prisma: fakePrisma },
} as unknown as NodeModule;
require.cache[require.resolve("./require-admin")] = {
  id: "require-admin", filename: "require-admin", loaded: true,
  exports: {
    requireAdminSession: async () =>
      signedIn ? null : new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  },
} as unknown as NodeModule;

globalThis.fetch = (async (url: string, init: { body: string }) => {
  const body = JSON.parse(init.body) as Record<string, unknown>;
  if (url.endsWith("/orders")) omsBodies.push(body);
  const json = url.endsWith("/intake") ? { customerId: "cus_1" } : { orderId: "oms_1" };
  return new Response(JSON.stringify(json), { status: 201 });
}) as unknown as typeof fetch;
console.info = () => {};
console.error = () => {};

const { POST } = require("../app/api/orders/[id]/confirm/route") as {
  POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
};

const confirm = async (body: unknown, id = "ord-1") => {
  const res = await POST(
    new NextRequest(`http://localhost/api/orders/${id}/confirm`, { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
};

beforeEach(() => {
  process.env.OMS_BASE_URL = "https://oms.test/api/v1";
  process.env.OMS_API_KEY = "test-secret-key";
  orders = [order()];
  signedIn = true;
  omsBodies = [];
  updates = 0;
});

test("a storefront COD order is sent as cod with its delivery fee, whatever the body says (covers AC-20)", async () => {
  const { status } = await confirm({ paymentMethod: "prepaid" });

  assert.equal(status, 200);
  assert.equal(omsBodies.length, 1);
  assert.equal(omsBodies[0].paymentMethod, "cod");
  assert.equal(omsBodies[0].shippingFee, "100.00"); // two places, not Decimal's "100"
  assert.equal(orders[0].status, "CONFIRMED");
});

test("a stored payment method ignores an invalid body value instead of refusing (covers AC-20)", async () => {
  const { status } = await confirm({ paymentMethod: "card" });
  assert.equal(status, 200);
  assert.equal(omsBodies[0].paymentMethod, "cod");
});

test("an admin created order uses the picked method and sends no shippingFee (covers AC-20)", async () => {
  orders = [order({ paymentMethod: null, shippingFee: decimal("0") })];

  const { status } = await confirm({ paymentMethod: "prepaid" });

  assert.equal(status, 200);
  assert.equal(omsBodies[0].paymentMethod, "prepaid");
  assert.equal("shippingFee" in omsBodies[0], false); // same bytes as before spec 0003
});

test("an admin created order still defaults to cod and still refuses an unknown method", async () => {
  orders = [order({ paymentMethod: null, shippingFee: decimal("0") })];
  assert.equal((await confirm({})).status, 200);
  assert.equal(omsBodies[0].paymentMethod, "cod");

  orders = [order({ paymentMethod: null, shippingFee: decimal("0") })];
  omsBodies = [];
  const { status, json } = await confirm({ paymentMethod: "card" });
  assert.equal(status, 400);
  assert.match(String(json.error), /cod or prepaid/);
  assert.equal(omsBodies.length, 0);
});

test("signed out: 401 and nothing is read, sent or changed", async () => {
  signedIn = false;
  const { status } = await confirm({});
  assert.equal(status, 401);
  assert.equal(omsBodies.length, 0);
  assert.equal(updates, 0);
  assert.equal(orders[0].status, "PENDING");
});

test("unknown order is 404 and an already confirmed order is 409, neither reaches the OMS", async () => {
  assert.equal((await confirm({}, "nope")).status, 404);
  orders = [order({ status: "CONFIRMED" })];
  assert.equal((await confirm({})).status, 409);
  assert.equal(omsBodies.length, 0);
});
