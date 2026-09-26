/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { orderTotal, parseNewOrder, toPrice } from "./new-order";

// The New order rules (VS-245) are tested directly, since this repo has no component rendering set
// up; POST /api/orders is tested as the real route against an in-memory fake database.

const valid = () => ({
  customerName: "TEST Customer",
  customerContact: "0917 000 0000",
  customerAddress: "1 Test St, Makati",
  notes: "",
  items: [{ productId: "p-soap", quantity: 2 }],
});
const errorOf = (body: unknown) => {
  const r = parseNewOrder(body);
  assert.equal(r.ok, false, JSON.stringify(body));
  return (r as { error: string }).error;
};

test("a valid body passes", () => {
  assert.deepEqual(parseNewOrder(valid()), {
    ok: true,
    value: {
      customerName: "TEST Customer", customerContact: "0917 000 0000", customerAddress: "1 Test St, Makati",
      notes: null, items: [{ productId: "p-soap", quantity: 2 }],
    },
  });
});

test("missing name, contact or items is refused", () => {
  assert.match(errorOf({ ...valid(), customerName: "   " }), /name/);
  assert.match(errorOf({ ...valid(), customerName: undefined }), /name/);
  assert.match(errorOf({ ...valid(), customerContact: "" }), /contact/);
  assert.match(errorOf({ ...valid(), items: [] }), /at least one item/);
  assert.match(errorOf({ ...valid(), items: undefined }), /at least one item/);
  assert.match(errorOf({ ...valid(), items: [{ productId: "", quantity: 1 }] }), /product/);
  assert.match(errorOf(null), /name/);
});

test("quantity 0, 100, 1.5 and non-numbers are refused; 1 and 99 pass", () => {
  for (const quantity of [0, 100, 1.5, -1, "2", undefined, NaN]) {
    assert.match(errorOf({ ...valid(), items: [{ productId: "p-soap", quantity }] }), /whole number from 1 to 99/, String(quantity));
  }
  for (const quantity of [1, 99]) assert.equal(parseNewOrder({ ...valid(), items: [{ productId: "p-soap", quantity }] }).ok, true);
});

test("the same product twice is refused", () => {
  const items = [{ productId: "p-soap", quantity: 1 }, { productId: "p-soap", quantity: 3 }];
  assert.match(errorOf({ ...valid(), items }), /twice/);
});

test("a client unitPrice (and any other extra field) is dropped", () => {
  const r = parseNewOrder({ ...valid(), status: "DELIVERED", items: [{ productId: "p-soap", quantity: 1, unitPrice: 0.01 }] });
  assert.ok(r.ok);
  assert.deepEqual(r.value.items, [{ productId: "p-soap", quantity: 1 }]);
  assert.equal("status" in r.value, false);
});

test("trimming: name, contact and address are trimmed; a blank address becomes null", () => {
  const r = parseNewOrder({ ...valid(), customerName: "  TEST  ", customerContact: " m.me/test ", customerAddress: "   " });
  assert.ok(r.ok);
  assert.equal(r.value.customerName, "TEST");
  assert.equal(r.value.customerContact, "m.me/test");
  assert.equal(r.value.customerAddress, null);
});

test("the total skips unpriced products and flags it as incomplete", () => {
  assert.deepEqual(orderTotal([{ quantity: 2, price: 150 }, { quantity: 1, price: null }]), { total: 300, incomplete: true });
  assert.deepEqual(orderTotal([{ quantity: 2, price: 150 }, { quantity: 3, price: 10 }]), { total: 330, incomplete: false });
  assert.equal(toPrice("1299.50"), 1299.5);
  assert.equal(toPrice(null), null);
  assert.equal(toPrice({ toString: () => "10.00" }), 10); // a Prisma Decimal
});

// ---- POST /api/orders ----

interface FakeProduct { id: string; name: string; price: string | null; isActive: boolean }
let products: FakeProduct[];
let created: { data: Record<string, unknown> }[];

const fakePrisma = {
  product: {
    findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      products.filter((p) => where.id.in.includes(p.id)).map((p) => ({ ...p, price: p.price === null ? null : { toString: () => p.price } })),
  },
  order: {
    create: async (args: { data: Record<string, unknown> }) => {
      created.push(args);
      return { id: "new-order", status: "PENDING", ...args.data, items: [] };
    },
  },
};
const stub = (path: string, exports: unknown) => {
  require.cache[path] = { id: path, filename: path, loaded: true, exports } as unknown as NodeModule;
};
stub(require.resolve("./prisma"), { prisma: fakePrisma });
stub(require.resolve("./require-admin"), { requireAdminSession: async () => null });
const { POST } = require("../app/api/orders/route") as { POST: (req: NextRequest) => Promise<Response> };

const postOrder = async (body: unknown) => {
  const res = await POST(new NextRequest("http://localhost/api/orders", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, json: await res.json() };
};

beforeEach(() => {
  products = [
    { id: "p-soap", name: "TEST Soap", price: "150.00", isActive: true },
    { id: "p-consult", name: "TEST Consult", price: null, isActive: true },
    { id: "p-old", name: "TEST Retired", price: "99.00", isActive: false },
  ];
  created = [];
  console.error = () => {};
});

test("route: creates the order with the product's own price (201, { data })", async () => {
  const { status, json } = await postOrder({
    ...valid(),
    customerAddress: "  ",
    items: [{ productId: "p-soap", quantity: 2, unitPrice: 0.01 }, { productId: "p-consult", quantity: 1 }],
  });
  assert.equal(status, 201);
  assert.equal(json.data.id, "new-order");
  assert.equal(created.length, 1);
  const data = created[0].data as { customerAddress: unknown; totalAmount: unknown; items: { create: { unitPrice: unknown }[] } };
  assert.equal(data.customerAddress, null);
  assert.equal(data.totalAmount, 300);
  assert.deepEqual(data.items.create.map((i) => i.unitPrice), [150, null]);
});

test("route: an unknown product or an inactive product answers 400, not 500, and creates nothing", async () => {
  const unknown = await postOrder({ ...valid(), items: [{ productId: "p-nope", quantity: 1 }] });
  assert.equal(unknown.status, 400);
  assert.match(unknown.json.error, /no longer exists/);

  const inactive = await postOrder({ ...valid(), items: [{ productId: "p-old", quantity: 1 }] });
  assert.equal(inactive.status, 400);
  assert.match(inactive.json.error, /TEST Retired is inactive/);
  assert.equal(created.length, 0);
});

test("route: bad quantity, a duplicate product, missing fields or a non-JSON body answer 400", async () => {
  for (const body of [
    { ...valid(), items: [{ productId: "p-soap", quantity: 100 }] },
    { ...valid(), items: [{ productId: "p-soap", quantity: 1 }, { productId: "p-soap", quantity: 1 }] },
    { ...valid(), customerContact: " " },
  ]) {
    assert.equal((await postOrder(body)).status, 400, JSON.stringify(body));
  }
  const res = await POST(new NextRequest("http://localhost/api/orders", { method: "POST", body: "not json" }));
  assert.equal(res.status, 400);
  assert.equal(created.length, 0);
});
