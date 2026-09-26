/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

// Drives the real POST /api/oms/webhook with signed requests against an in-memory fake database.
// Nothing here touches a real database or the OMS.

const SECRET = "test-secret-not-real";
process.env.OMS_WEBHOOK_SIGNING_SECRET = SECRET;
process.env.OMS_BASE_URL = "https://oms.test/api/v1";
process.env.OMS_API_KEY = "test-key";

interface FakeOrder {
  id: string; orderNumber: string; status: string; omsLastEventAt: Date | null;
  omsOrderId: string | null; customerAddress: string | null;
}
interface EventRow { eventId: string; type: string }

let orders: FakeOrder[];
let events: EventRow[];
let failTransaction: boolean;
let failLookup: boolean;
let raceOnCreate: boolean; // simulate a concurrent delivery committing the same eventId first

const p2002 = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

// Just the Prisma calls the route makes. $transaction rolls back if the callback throws.
const fakePrisma = {
  order: {
    findUnique: async ({ where }: { where: { orderNumber: string } }) => {
      if (failLookup) throw new Error("db down");
      const o = orders.find((x) => x.orderNumber === where.orderNumber);
      return o ? { id: o.id, omsOrderId: o.omsOrderId, customerAddress: o.customerAddress } : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeOrder> }) => {
      const o = orders.find((x) => x.id === where.id)!;
      Object.assign(o, data);
      return o;
    },
    updateMany: async ({ where, data }: { where: { id: string; OR: [unknown, { omsLastEventAt: { lte: Date } }] }; data: Partial<FakeOrder> }) => {
      const o = orders.find((x) => x.id === where.id);
      const lte = where.OR[1].omsLastEventAt.lte;
      if (!o || (o.omsLastEventAt && o.omsLastEventAt > lte)) return { count: 0 };
      Object.assign(o, data);
      return { count: 1 };
    },
  },
  omsWebhookEvent: {
    findUnique: async ({ where }: { where: { eventId: string } }) => events.find((e) => e.eventId === where.eventId) ?? null,
    create: async ({ data }: { data: EventRow }) => {
      if (raceOnCreate || events.some((e) => e.eventId === data.eventId)) throw p2002();
      events.push({ ...data });
      return data;
    },
  },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const snapshot = { orders: orders.map((o) => ({ ...o })), events: events.map((e) => ({ ...e })) };
    try {
      if (failTransaction) throw new Error("db down");
      return await fn(fakePrisma);
    } catch (error) {
      ({ orders, events } = snapshot);
      throw error;
    }
  },
};

// Load the route with the fake in place of the real Prisma client (must happen before the require).
const prismaPath = require.resolve("./prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma: fakePrisma } } as unknown as NodeModule;
const { POST } = require("../app/api/oms/webhook/route") as { POST: (req: NextRequest) => Promise<Response> };

const T1 = "2026-09-24T03:15:00.123Z";
const T2 = "2026-09-24T03:20:00.000Z";

function post(payload: Record<string, unknown>, { signature }: { signature?: string } = {}) {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = signature ?? "sha256=" + createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
  return POST(
    new NextRequest("http://localhost/api/oms/webhook", {
      method: "POST",
      headers: { "x-oms-timestamp": ts, "x-oms-signature": sig },
      body,
    }),
  );
}

const statusEvent = (eventId: string, status: string, occurredAt = T1) => ({
  event: "order.status_changed", eventId, occurredAt, orderId: "oms-1", externalRef: "VS-1001", status, previousStatus: "APPROVED",
});
const addressEvent = (eventId: string) => ({
  event: "order.address_changed", eventId, occurredAt: T1, orderId: "oms-1", externalRef: "VS-1001", status: "APPROVED",
});
const order = () => orders[0];

// Fake OMS for GET /orders/{id}: every test starts with a new address on the OMS side.
type OmsReply = { status: number; json: unknown } | "network-error" | "timeout";
let omsReply: OmsReply;
const omsCalls: { url: string; auth: string | undefined }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit) => {
  omsCalls.push({ url, auth: (init.headers as Record<string, string>).Authorization });
  if (omsReply === "network-error") throw new TypeError("fetch failed");
  if (omsReply === "timeout") throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  return new Response(JSON.stringify(omsReply.json), { status: omsReply.status });
}) as unknown as typeof fetch;

const logs: string[] = [];
beforeEach(() => {
  orders = [{ id: "o1", orderNumber: "VS-1001", status: "PENDING", omsLastEventAt: null, omsOrderId: "oms-1", customerAddress: "1 Old St, Makati" }];
  events = [];
  omsReply = { status: 200, json: { status: "APPROVED", shippingAddress: "2 New St, Taguig", tracking: null } };
  omsCalls.length = 0;
  failTransaction = failLookup = raceOnCreate = false;
  logs.length = 0;
  for (const level of ["info", "warn", "error"] as const) console[level] = (msg: string) => void logs.push(String(msg));
});

test("each OMS status maps to the right storefront status", async () => {
  const expected: Record<string, string> = {
    PENDING_VERIFICATION: "CONFIRMED", APPROVED: "CONFIRMED", ALLOCATED: "CONFIRMED",
    PACKED: "PROCESSING", SHIPPED: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED", REJECTED: "CANCELLED",
  };
  for (const [omsStatus, storefront] of Object.entries(expected)) {
    orders[0].status = "PENDING";
    orders[0].omsLastEventAt = null;
    const res = await post(statusEvent(`evt-${omsStatus}`, omsStatus));
    assert.equal(res.status, 200, omsStatus);
    assert.equal(order().status, storefront, omsStatus);
    assert.equal(order().omsLastEventAt?.toISOString(), T1, omsStatus);
    assert.ok(events.some((e) => e.eventId === `evt-${omsStatus}`), omsStatus);
  }
});

test("FAILED_DELIVERY and RETURNED are recorded but change nothing", async () => {
  orders[0].status = "OUT_FOR_DELIVERY";
  for (const omsStatus of ["FAILED_DELIVERY", "RETURNED"]) {
    const res = await post(statusEvent(`evt-${omsStatus}`, omsStatus));
    assert.equal(res.status, 200);
    assert.equal(order().status, "OUT_FOR_DELIVERY");
    assert.equal(order().omsLastEventAt, null);
    assert.ok(events.some((e) => e.eventId === `evt-${omsStatus}`));
  }
});

test("a repeated eventId is ignored", async () => {
  assert.equal((await post(statusEvent("evt-1", "SHIPPED"))).status, 200);
  orders[0].status = "PROCESSING"; // if the repeat were applied, this would flip back to OUT_FOR_DELIVERY
  const res = await post(statusEvent("evt-1", "SHIPPED"));
  assert.equal(res.status, 200);
  assert.equal(order().status, "PROCESSING");
  assert.equal(events.length, 1);
});

test("an out-of-order (older) event is ignored", async () => {
  assert.equal((await post(statusEvent("evt-new", "SHIPPED", T2))).status, 200);
  const res = await post(statusEvent("evt-old", "PACKED", T1));
  assert.equal(res.status, 200);
  assert.equal(order().status, "OUT_FOR_DELIVERY");
  assert.equal(order().omsLastEventAt?.toISOString(), T2);
  assert.deepEqual(events.map((e) => e.eventId), ["evt-new"]);
});

test("an unknown order answers 200 and saves nothing", async () => {
  const res = await post({ ...statusEvent("evt-x", "SHIPPED"), externalRef: "NO-SUCH-ORDER" });
  assert.equal(res.status, 200);
  assert.equal(order().status, "PENDING");
  assert.equal(events.length, 0);
});

test("shipment.updated is recorded but never changes the order status", async () => {
  const res = await post({
    event: "shipment.updated", eventId: "evt-ship", occurredAt: T1, orderId: "oms-1", externalRef: "VS-1001",
    status: "delivered", tracking: { courier: "TEST", waybill: "W123" },
  });
  assert.equal(res.status, 200);
  assert.equal(order().status, "PENDING");
  assert.equal(order().omsLastEventAt, null);
  assert.deepEqual(events, [{ eventId: "evt-ship", type: "shipment.updated" }]);
});

test("a bad signature is refused (401) and nothing is saved", async () => {
  const res = await post(statusEvent("evt-bad", "SHIPPED"), { signature: "sha256=" + "0".repeat(64) });
  assert.equal(res.status, 401);
  assert.equal(order().status, "PENDING");
  assert.equal(events.length, 0);
});

test("a database failure answers 500 (so the OMS retries) and rolls back", async () => {
  failTransaction = true;
  const res = await post(statusEvent("evt-db", "SHIPPED"));
  assert.equal(res.status, 500);
  assert.equal(order().status, "PENDING");
  assert.equal(events.length, 0);

  failTransaction = false;
  failLookup = true;
  assert.equal((await post(statusEvent("evt-db", "SHIPPED"))).status, 500);

  failLookup = false; // the retry then succeeds
  assert.equal((await post(statusEvent("evt-db", "SHIPPED"))).status, 200);
  assert.equal(order().status, "OUT_FOR_DELIVERY");
});

test("losing a race on the same eventId counts as a duplicate (200)", async () => {
  raceOnCreate = true;
  const res = await post(statusEvent("evt-race", "SHIPPED"));
  assert.equal(res.status, 200);
  assert.equal(order().status, "PENDING"); // rolled back; the winning delivery is the one that saved
});

test("signed but unusable events are refused (400), not silently accepted", async () => {
  for (const bad of [
    { ...statusEvent("evt-a", "SOME_NEW_STATUS") },
    { ...statusEvent("", "SHIPPED") },
    { ...statusEvent("evt-c", "SHIPPED", "not-a-date") },
    { ...addressEvent("evt-d"), orderId: undefined },
    { ...addressEvent("") },
  ]) {
    assert.equal((await post(bad)).status, 400);
  }
  assert.equal(order().status, "PENDING");
  assert.equal(events.length, 0);
});

test("logs carry the eventId and outcome, not the body", async () => {
  await post(statusEvent("evt-log", "SHIPPED"));
  assert.ok(logs.length > 0);
  for (const line of logs) {
    assert.match(line, /evt-log/);
    assert.doesNotMatch(line, /VS-1001|SHIPPED|previousStatus/);
  }
});

test("an unknown signed event type answers 200 ignored and writes nothing", async () => {
  const res = await post({ ...statusEvent("evt-new-kind", "SHIPPED"), event: "order.something_new" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, outcome: "ignored" });
  assert.equal(order().status, "PENDING");
  assert.equal(events.length, 0);
  assert.equal(omsCalls.length, 0);
  assert.deepEqual(logs.map((l) => JSON.parse(l)), [{ event: "oms_webhook", eventId: "evt-new-kind", outcome: "ignored" }]);
});

// order.address_changed (VS-250): the event never carries the address; the route reads it from the OMS.
const outcomeOf = async (res: Response) => ((await res.json()) as { outcome?: string }).outcome;

test("address change: saves the OMS's current address with the event row, leaves status and omsLastEventAt alone", async () => {
  const res = await post(addressEvent("evt-addr"));
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "address_updated");
  assert.equal(order().customerAddress, "2 New St, Taguig");
  assert.equal(order().status, "PENDING");
  assert.equal(order().omsLastEventAt, null);
  assert.deepEqual(events, [{ eventId: "evt-addr", type: "order.address_changed" }]);
  assert.deepEqual(omsCalls, [{ url: "https://oms.test/api/v1/orders/oms-1", auth: "Bearer test-key" }]);
});

test("address change: the address and the event row are saved in one transaction", async () => {
  failTransaction = true;
  const res = await post(addressEvent("evt-addr-tx"));
  assert.equal(res.status, 500);
  assert.equal(order().customerAddress, "1 Old St, Makati");
  assert.equal(events.length, 0);
});

test("address change: a repeated eventId changes nothing", async () => {
  assert.equal((await post(addressEvent("evt-addr"))).status, 200);
  orders[0].customerAddress = "manually different";
  const res = await post(addressEvent("evt-addr"));
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "duplicate");
  assert.equal(order().customerAddress, "manually different");
  assert.equal(events.length, 1);
  assert.equal(omsCalls.length, 1);
});

test("address change: the same address again answers address_unchanged and still records the event", async () => {
  orders[0].customerAddress = "2 New St, Taguig";
  const res = await post(addressEvent("evt-same"));
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "address_unchanged");
  assert.equal(order().customerAddress, "2 New St, Taguig");
  assert.deepEqual(events.map((e) => e.eventId), ["evt-same"]);
});

test("address change: OMS timeout, 5xx, network error or 401 answer 500 and save nothing", async () => {
  const cases: [OmsReply, string][] = [
    ["timeout", "oms_read_failed"],
    ["network-error", "oms_read_failed"],
    [{ status: 500, json: { error: "internal_error" } }, "oms_read_failed"],
    [{ status: 503, json: { error: "unavailable" } }, "oms_read_failed"],
    [{ status: 401, json: { error: "unauthorized" } }, "oms_auth"],
  ];
  for (const [reply, loggedOutcome] of cases) {
    omsReply = reply;
    logs.length = 0;
    const res = await post(addressEvent("evt-fail"));
    assert.equal(res.status, 500, JSON.stringify(reply));
    assert.equal(order().customerAddress, "1 Old St, Makati");
    assert.equal(events.length, 0);
    assert.ok(logs.some((l) => JSON.parse(l).outcome === loggedOutcome), loggedOutcome);
  }
  // The OMS retries and this time the read works.
  omsReply = { status: 200, json: { status: "APPROVED", shippingAddress: "2 New St, Taguig", tracking: null } };
  assert.equal((await post(addressEvent("evt-fail"))).status, 200);
  assert.equal(order().customerAddress, "2 New St, Taguig");
});

test("address change: an OMS 404 answers 200 and records the event without touching the address", async () => {
  omsReply = { status: 404, json: { error: "order_not_found" } };
  const res = await post(addressEvent("evt-404"));
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "oms_order_not_found");
  assert.equal(order().customerAddress, "1 Old St, Makati");
  assert.deepEqual(events, [{ eventId: "evt-404", type: "order.address_changed" }]);
});

test("address change: an omsOrderId mismatch changes nothing and never calls the OMS", async () => {
  const res = await post({ ...addressEvent("evt-mismatch"), orderId: "oms-OTHER" });
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "order_mismatch");
  assert.equal(order().customerAddress, "1 Old St, Makati");
  assert.equal(events.length, 0);
  assert.equal(omsCalls.length, 0);
});

test("address change: an unknown order answers 200 unknown_order and saves nothing", async () => {
  const res = await post({ ...addressEvent("evt-unknown"), externalRef: "NO-SUCH-ORDER" });
  assert.equal(res.status, 200);
  assert.equal(await outcomeOf(res), "unknown_order");
  assert.equal(events.length, 0);
});

test("address change: logs never carry the address, the body or the key", async () => {
  await post(addressEvent("evt-addr-log"));
  omsReply = { status: 401, json: {} };
  await post(addressEvent("evt-addr-log2"));
  assert.ok(logs.length >= 2);
  for (const line of logs) assert.doesNotMatch(line, /New St|Old St|Taguig|test-key|VS-1001|oms-1/);
});
