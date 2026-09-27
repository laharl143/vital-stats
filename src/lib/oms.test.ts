import assert from "node:assert/strict";
import { test } from "node:test";
import { getAvailability, getOmsOrder, sendOrderToOms, type OmsOrderInput } from "./oms";

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

const readOpts = (fetchFn: typeof fetch) => ({ baseUrl: "https://oms.test/api/v1/", apiKey: "test-key", fetchFn });

test("getOmsOrder: GETs the order with the Bearer key and returns its shippingAddress", async () => {
  const { fetchFn, calls } = fakeFetch([{ status: 200, json: { status: "APPROVED", shippingAddress: "2 New St, Taguig", tracking: null } }]);
  const result = await getOmsOrder("ord_1", readOpts(fetchFn));
  assert.deepEqual(result, { ok: true, shippingAddress: "2 New St, Taguig" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://oms.test/api/v1/orders/ord_1");
  assert.equal(calls[0].headers.Authorization, "Bearer test-key");
  assert.equal(calls[0].body, undefined);
});

test("getOmsOrder: maps 404, 401, 5xx, network errors and odd replies to typed failures", async () => {
  const cases: [Reply, string][] = [
    [{ status: 404, json: { error: "order_not_found" } }, "not_found"],
    [{ status: 401, json: { error: "unauthorized" } }, "auth"],
    [{ status: 500, json: { error: "internal_error" } }, "server"],
    [{ status: 503, json: {} }, "server"],
    ["network-error", "network"],
    [{ status: 200, json: { status: "APPROVED" } }, "bad_reply"],
  ];
  for (const [reply, reason] of cases) {
    const { fetchFn } = fakeFetch([reply]);
    assert.deepEqual(await getOmsOrder("ord_1", readOpts(fetchFn)), { ok: false, reason }, reason);
  }
});

test("getOmsOrder: not configured means no call at all", async () => {
  const { fetchFn, calls } = fakeFetch([]);
  assert.deepEqual(await getOmsOrder("ord_1", { baseUrl: undefined, apiKey: "k", fetchFn }), { ok: false, reason: "not_configured" });
  assert.equal(calls.length, 0);
});

// getAvailability (VS-253). Fake replies only, never the live OMS.
const availabilityFetch = (reply: { status: number; json: unknown; total?: number } | "network-error") => {
  const urls: string[] = [];
  const fetchFn = (async (url: string) => {
    urls.push(url);
    if (reply === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(reply.json), {
      status: reply.status,
      headers: { "X-Total-Count": String(reply.total ?? 0) },
    });
  }) as unknown as typeof fetch;
  return { fetchFn, urls };
};
const availOpts = (fetchFn: typeof fetch) => ({ baseUrl: "https://oms.test/api/v1/", apiKey: "test-key", fetchFn });

test("getAvailability: maps rows by sku, reads one page of 500", async () => {
  const { fetchFn, urls } = availabilityFetch({
    status: 200,
    total: 2,
    json: [
      { sku: "lumela-soap", available: 4, price: "299.00", currency: "PHP" },
      { sku: "nad-plus", available: 0, price: null, currency: "PHP" },
      { sku: 7, available: 1 }, // malformed row skipped
    ],
  });
  const result = await getAvailability(availOpts(fetchFn));
  assert.equal(urls[0], "https://oms.test/api/v1/products/availability?limit=500");
  assert.ok(result.ok);
  assert.deepEqual(result.bySku.get("lumela-soap"), { available: 4, price: "299.00", currency: "PHP" });
  assert.deepEqual(result.bySku.get("nad-plus"), { available: 0, price: null, currency: "PHP" });
  assert.equal(result.bySku.size, 2);
});

test("getAvailability: failures come back as reasons", async () => {
  assert.deepEqual(await getAvailability({ baseUrl: undefined, apiKey: "k" }), { ok: false, reason: "not_configured" });
  assert.deepEqual(await getAvailability(availOpts(availabilityFetch("network-error").fetchFn)), { ok: false, reason: "network" });
  assert.deepEqual(await getAvailability(availOpts(availabilityFetch({ status: 401, json: {} }).fetchFn)), { ok: false, reason: "auth" });
  assert.deepEqual(await getAvailability(availOpts(availabilityFetch({ status: 500, json: {} }).fetchFn)), { ok: false, reason: "server" });
  assert.deepEqual(await getAvailability(availOpts(availabilityFetch({ status: 200, json: { data: [] } }).fetchFn)), { ok: false, reason: "bad_reply" });
});

test("delivery fee: sent to /orders when above zero, left out when zero (spec 0003, AC-20)", async () => {
  const withFee = fakeFetch([{ status: 201, json: { customerId: "cus_1" } }, { status: 201, json: { orderId: "ord_1" } }]);
  await sendOrderToOms(order({ shippingFee: "100.00" }), opts(withFee.fetchFn));
  assert.equal(JSON.parse(withFee.calls[1].body).shippingFee, "100.00");

  // A zero fee (every admin created order) must send exactly the bytes it sent before this feature.
  for (const shippingFee of ["0.00", "0", undefined]) {
    const noFee = fakeFetch([{ status: 201, json: { customerId: "cus_1" } }, { status: 201, json: { orderId: "ord_1" } }]);
    const plain = fakeFetch([{ status: 201, json: { customerId: "cus_1" } }, { status: 201, json: { orderId: "ord_1" } }]);
    await sendOrderToOms(order({ shippingFee }), opts(noFee.fetchFn));
    await sendOrderToOms(order(), opts(plain.fetchFn));
    assert.equal(noFee.calls[1].body, plain.calls[1].body, String(shippingFee));
    assert.equal("shippingFee" in JSON.parse(noFee.calls[1].body), false);
  }
});

// Regression (checkout /check verify, 2026-09-27): Next's `revalidate` served stock of any age and
// kept serving the last good answer while the OMS was down. The cache must be a strict 30 seconds.
test("getAvailability: a good answer is reused for under 30 seconds, never at 30 or later", async () => {
  let stock = 5;
  const inits: RequestInit[] = [];
  const fetchFn = (async (_url: string, init: RequestInit) => {
    inits.push(init);
    return new Response(JSON.stringify([{ sku: "lumela-soap", available: stock, price: "150.00", currency: "PHP" }]), { status: 200 });
  }) as unknown as typeof fetch;
  const at = async (now: number) => {
    const r = await getAvailability({ ...availOpts(fetchFn), now });
    return r.ok ? r.bySku.get("lumela-soap")?.available : r.reason;
  };

  assert.equal(await at(1_000_000), 5);
  stock = 1;
  assert.equal(await at(1_029_999), 5); // still inside 30 s: the cached answer
  assert.equal(inits.length, 1);
  assert.equal(await at(1_030_000), 1); // at 30 s the answer is fresh, not the old one
  assert.equal(inits.length, 2);
  for (const init of inits) {
    assert.equal(init.cache, "no-store");
    assert.equal("next" in init, false); // never Next's stale while revalidate cache
  }
});

test("getAvailability: a failure is never cached and never hides behind an old answer", async () => {
  let down = false;
  const fetchFn = (async () => {
    if (down) throw new TypeError("fetch failed");
    return new Response(JSON.stringify([{ sku: "lumela-soap", available: 5, price: "150.00", currency: "PHP" }]), { status: 200 });
  }) as unknown as typeof fetch;
  assert.ok((await getAvailability({ ...availOpts(fetchFn), now: 2_000_000 })).ok);
  down = true;
  assert.deepEqual(await getAvailability({ ...availOpts(fetchFn), now: 2_030_000 }), { ok: false, reason: "network" });
  down = false;
  assert.ok((await getAvailability({ ...availOpts(fetchFn), now: 2_030_001 })).ok); // the failure was not kept
});

test("getAvailability: fresh skips the cache (checkout's final check at submit)", async () => {
  let stock = 5;
  let calls = 0;
  const fetchFn = (async () => {
    calls++;
    return new Response(JSON.stringify([{ sku: "lumela-soap", available: stock, price: "150.00", currency: "PHP" }]), { status: 200 });
  }) as unknown as typeof fetch;
  await getAvailability({ ...availOpts(fetchFn), now: 3_000_000 });
  stock = 1;
  const r = await getAvailability({ ...availOpts(fetchFn), now: 3_000_001, fresh: true });
  assert.ok(r.ok);
  assert.equal(r.bySku.get("lumela-soap")?.available, 1);
  assert.equal(calls, 2);
});
