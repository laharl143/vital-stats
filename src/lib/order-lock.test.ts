/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { OMS_LOCK_MESSAGE, isLockedByOms } from "./order-lock";

// The admin page's "disabled" state is decided by isLockedByOms (tested directly, since this repo
// has no component rendering set up). PATCH /api/orders/[id] is tested as the real route against an
// in-memory fake database, so a refused change can be shown to write nothing.

interface FakeOrder {
  id: string; status: string; omsOrderId: string | null;
  notes: string | null; adminNotes: string | null; customerAddress: string | null;
}
let orders: FakeOrder[];
let writes: Record<string, unknown>[];

const fakePrisma = {
  order: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const o = orders.find((x) => x.id === where.id);
      return o ? { ...o } : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const o = orders.find((x) => x.id === where.id);
      if (!o) throw new Error("Record to update not found");
      writes.push(data);
      Object.assign(o, data);
      return { ...o, items: [] };
    },
  },
};

// Load the route with the fake database and an always-authorized admin session in place.
const stub = (path: string, exports: unknown) => {
  require.cache[path] = { id: path, filename: path, loaded: true, exports } as unknown as NodeModule;
};
stub(require.resolve("./prisma"), { prisma: fakePrisma });
stub(require.resolve("./require-admin"), { requireAdminSession: async () => null });
const { PATCH } = require("../app/api/orders/[id]/route") as {
  PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
};

const patch = (id: string, body: Record<string, unknown>) =>
  PATCH(
    new NextRequest(`http://localhost/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  const base = { notes: null, adminNotes: null, customerAddress: "1 Test St" };
  orders = [
    { id: "sent", status: "CONFIRMED", omsOrderId: "oms-1", ...base },
    { id: "unsent", status: "PENDING", omsOrderId: null, ...base },
  ];
  writes = [];
  console.error = () => {};
});

test("isLockedByOms: locked only when omsOrderId is set", () => {
  assert.equal(isLockedByOms({ omsOrderId: "oms-1" }), true);
  assert.equal(isLockedByOms({ omsOrderId: null }), false);
  assert.equal(isLockedByOms({ omsOrderId: "" }), false);
  assert.equal(isLockedByOms({}), false);
});

test("a sent order refuses a status change with 409 and writes nothing", async () => {
  for (const status of ["PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PENDING"]) {
    const res = await patch("sent", { status });
    assert.equal(res.status, 409, status);
    assert.deepEqual(await res.json(), { error: "This order is in the OMS. Change its status there." });
  }
  assert.equal(OMS_LOCK_MESSAGE, "This order is in the OMS. Change its status there.");
  assert.deepEqual(writes, []);
  assert.equal(orders[0].status, "CONFIRMED");
});

test("a sent order refuses a status change even when it arrives together with a notes change", async () => {
  const res = await patch("sent", { status: "CANCELLED", adminNotes: "sneaky" });
  assert.equal(res.status, 409);
  assert.deepEqual(writes, []);
  assert.equal(orders[0].adminNotes, null);
});

test("a sent order still accepts an adminNotes-only change", async () => {
  const res = await patch("sent", { adminNotes: "called the customer" });
  assert.equal(res.status, 200);
  assert.deepEqual(writes, [{ adminNotes: "called the customer" }]);
  assert.equal(orders[0].status, "CONFIRMED");
});

test("a sent order still accepts a notes-only change", async () => {
  assert.equal((await patch("sent", { notes: "leave at the gate" })).status, 200);
  assert.deepEqual(writes, [{ notes: "leave at the gate" }]);
});

test("an order with no omsOrderId still accepts a status change", async () => {
  const res = await patch("unsent", { status: "CANCELLED" });
  assert.equal(res.status, 200);
  assert.deepEqual(writes, [{ status: "CANCELLED" }]);
  assert.equal(orders[1].status, "CANCELLED");
});

test("existing rules are unchanged: CONFIRMED via PATCH is still 400 for an unsent order, missing order is 404", async () => {
  const res = await patch("unsent", { status: "CONFIRMED" });
  assert.equal(res.status, 400);
  assert.deepEqual(writes, []);
  assert.equal((await patch("nope", { status: "CANCELLED" })).status, 404);
});
