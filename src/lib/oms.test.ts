import assert from "node:assert/strict";
import { test } from "node:test";
import { sendOrderToOms, type OmsOrderInput } from "./oms";

// Every test uses a fake fetch. Nothing here may ever reach the live OMS.

const order = (over: Partial<OmsOrderInput> = {}): OmsOrderInput => ({
  orderNumber: "VS-1001",
  customerName: "TEST Customer",
  customerContact: "0917 000 0000",
  customerAddress: "1 Test St, Makati",
  items: [{ quantity: 2, product: { slug: "lumela-soap", requiresPrescription: false } }],
  ...over,
});

interface Call { url: string; headers: Record<string, string>; body: string }
type Reply = { status: number; json: unknown } | "network-error";

// Answers with `replies` in order and records every call.
function fakeFetch(replies: Reply[]) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: init.body as string });
    const reply = replies[calls.length - 1];
    if (!reply || reply === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(reply.json), { status: reply.status });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

const opts = (fetchFn: typeof fetch) => ({
  baseUrl: "https://oms.test/api/v1/",
  apiKey: "test-key",
  paymentMethod: "cod" as const,
  fetchFn,
});

test("success: intake then orders, correct payloads, headers and ids", async () => {
  const { fetchFn, calls } = fakeFetch([
    { status: 201, json: { customerId: "cus_1" } },
    { status: 201, json: { orderId: "ord_1" } },
  ]);
  const result = await sendOrderToOms(order(), opts(fetchFn));

  assert.deepEqual(result, { ok: true, customerId: "cus_1", orderId: "ord_1" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://oms.test/api/v1/intake");
  assert.deepEqual(JSON.parse(calls[0].body), {
    externalRef: "cust-VS-1001",
    customer: { name: "TEST Customer", phone: "0917 000 0000", address: "1 Test St, Makati" },
  });
  assert.equal(calls[1].url, "https://oms.test/api/v1/orders");
  assert.deepEqual(JSON.parse(calls[1].body), {
    externalRef: "VS-1001",
    customerId: "cus_1",
    items: [{ sku: "lumela-soap", qty: 2 }],
    paymentMethod: "cod",
    shippingAddress: "1 Test St, Makati",
  });
  for (const c of calls) {
    assert.equal(c.headers.Authorization, "Bearer test-key");
    assert.equal(c.headers["Idempotency-Key"], JSON.parse(c.body).externalRef);
  }
});

test("missing address: refused, OMS never called", async () => {
  for (const customerAddress of [null, "", "   "]) {
    const { fetchFn, calls } = fakeFetch([]);
    const result = await sendOrderToOms(order({ customerAddress }), opts(fetchFn));
    assert.equal(result.ok, false);
    assert.match((result as { message: string }).message, /shipping address/i);
    assert.equal(calls.length, 0);
  }
});

test("prescription product: refused, OMS never called", async () => {
  const { fetchFn, calls } = fakeFetch([]);
  const result = await sendOrderToOms(
    order({
      items: [
        { quantity: 1, product: { slug: "lumela-soap", requiresPrescription: false } },
        { quantity: 1, product: { slug: "tirzepatide", requiresPrescription: true } },
      ],
    }),
    opts(fetchFn),
  );
  assert.equal(result.ok, false);
  assert.match((result as { message: string }).message, /prescription/i);
  assert.equal(calls.length, 0);
});

test("unknown_sku: plain message, raw response text is never shown", async () => {
  const { fetchFn } = fakeFetch([
    { status: 201, json: { customerId: "cus_1" } },
    { status: 404, json: { error: "unknown_sku", message: "RAW-SECRET-TEXT sku nope-123" } },
  ]);
  const result = await sendOrderToOms(order(), opts(fetchFn));
  assert.equal(result.ok, false);
  const message = (result as { message: string }).message;
  assert.match(message, /unknown SKU/i);
  assert.doesNotMatch(message, /RAW-SECRET-TEXT|nope-123/);
});

test("network failure: retryable message, no ids", async () => {
  const { fetchFn } = fakeFetch(["network-error"]);
  const result = await sendOrderToOms(order(), opts(fetchFn));
  assert.equal(result.ok, false);
  assert.match((result as { message: string }).message, /couldn't reach the OMS/i);
});

test("retry after intake succeeded but orders failed: same payloads, same customer, then succeeds", async () => {
  const twoItems = [
    { quantity: 1, product: { slug: "b-soap", requiresPrescription: false } },
    { quantity: 3, product: { slug: "a-soap", requiresPrescription: false } },
  ];
  const a = fakeFetch([
    { status: 201, json: { customerId: "cus_1" } },
    { status: 500, json: { error: "internal_error", message: "boom" } },
  ]);
  const failed = await sendOrderToOms(order({ items: twoItems }), opts(a.fetchFn));
  assert.equal(failed.ok, false);
  assert.match((failed as { message: string }).message, /try again/i);

  // Retry: same order, but the DB returns the item rows in a different order this time.
  const b = fakeFetch([
    { status: 200, json: { customerId: "cus_1" } }, // idempotent replay of intake
    { status: 201, json: { orderId: "ord_1" } },
  ]);
  const ok = await sendOrderToOms(order({ items: [...twoItems].reverse() }), opts(b.fetchFn));

  assert.deepEqual(ok, { ok: true, customerId: "cus_1", orderId: "ord_1" });
  // Intake replayed byte-for-byte (same externalRef + payload), and so is the orders call.
  assert.equal(b.calls[0].body, a.calls[0].body);
  assert.equal(b.calls[0].headers["Idempotency-Key"], "cust-VS-1001");
  assert.equal(b.calls[1].body, a.calls[1].body);
  assert.equal(b.calls[1].headers["Idempotency-Key"], "VS-1001");
});
