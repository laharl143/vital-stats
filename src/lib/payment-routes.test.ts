/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

// Spec 0004 end to end: POST /api/checkout (online), the PayMongo webhook, the automatic OMS send,
// the status and cancel endpoints, lazy expiry, the admin confirm, refund and PATCH routes, and the
// OMS webhook's refund flag. All against an in memory database, a fake OMS and a fake PayMongo.
// Nothing here reaches the real database, the OMS, PayMongo or Resend.

const WEBHOOK_SECRET = "whsk_test_not_real";
Object.assign(process.env, {
  OMS_BASE_URL: "https://oms.test/api/v1",
  OMS_API_KEY: "test-key",
  PAYMONGO_SECRET_KEY: "sk_test_not_real",
  PAYMONGO_WEBHOOK_SECRET: WEBHOOK_SECRET,
  NEXTAUTH_URL: "https://site.test/",
  OMS_WEBHOOK_SIGNING_SECRET: "oms-secret-not-real",
});

// ── In memory database ──────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown> & { id: string };
const DECIMALS = new Set(["totalAmount", "shippingFee", "paidAmount", "unitPrice", "price"]);
const decimal = (s: string) => ({ toString: () => s, toFixed: (n: number) => Number(s).toFixed(n) });
const toDb = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, DECIMALS.has(k) && typeof v === "string" ? decimal(v) : v]));

const matches = (row: Row, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([k, cond]) => {
    const v = row[k] ?? null;
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { lt?: Date; gte?: Date; in?: unknown[]; lte?: Date };
      if (c.in) return c.in.includes(v);
      if (c.lt) return v !== null && (v as Date) < c.lt;
      if (c.gte) return v !== null && (v as Date) >= c.gte;
    }
    if (k === "OR") return (cond as Record<string, unknown>[]).some((w) => matches(row, w));
    return v === (cond ?? null);
  });

let orders: Row[];
let items: Row[];
let webhookEvents: { eventId: string }[];
let products: Row[];

const withItems = (o: Row) => ({
  ...o,
  items: items.filter((i) => i.orderId === o.id).map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) })),
});
const unique = (where: Record<string, unknown>) => orders.find((o) => matches(o, where)) ?? null;
const p2002 = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
const UNIQUE_KEYS = ["orderNumber", "checkoutKey", "paymongoCheckoutId", "paymongoPaymentId"];
const clash = (row: Row) => UNIQUE_KEYS.some((k) => row[k] != null && orders.some((o) => o !== row && o[k] === row[k]));

const fakePrisma = {
  product: {
    findMany: async ({ where }: { where: { slug: { in: string[] } } }) => products.filter((p) => where.slug.in.includes(p.slug as string)),
  },
  order: {
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      const o = unique(where);
      return o ? withItems(o) : null;
    },
    findMany: async ({ where, take }: { where: Record<string, unknown>; take?: number }) =>
      orders.filter((o) => matches(o, where)).slice(0, take ?? Infinity).map(withItems),
    count: async ({ where }: { where: Record<string, unknown> }) => orders.filter((o) => matches(o, where)).length,
    create: async ({ data }: { data: Record<string, unknown> & { items: { create: Record<string, unknown>[] } } }) => {
      const { items: nested, ...rest } = data;
      const row: Row = { id: `ord-${orders.length + 1}`, createdAt: new Date(), omsOrderId: null, adminNotes: null, ...toDb(rest) };
      if (clash(row)) throw p2002();
      orders.push(row);
      for (const i of nested.create) items.push({ id: `item-${items.length + 1}`, orderId: row.id, ...toDb(i) });
      return { id: row.id, orderNumber: row.orderNumber };
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const o = orders.find((x) => x.id === where.id)!;
      Object.assign(o, toDb(data));
      return withItems(o);
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = orders.filter((o) => matches(o, where));
      for (const o of hit) {
        const before = { ...o };
        Object.assign(o, toDb(data));
        if (clash(o)) {
          Object.assign(o, before);
          throw p2002();
        }
      }
      return { count: hit.length };
    },
  },
  omsWebhookEvent: {
    findUnique: async ({ where }: { where: { eventId: string } }) => webhookEvents.find((e) => e.eventId === where.eventId) ?? null,
    create: async ({ data }: { data: { eventId: string } }) => {
      webhookEvents.push(data);
      return data;
    },
  },
  $transaction: async (arg: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[]) => (Array.isArray(arg) ? Promise.all(arg) : arg(fakePrisma)),
};

let signedIn: boolean;
let emails: Record<string, unknown>[];
const stub = (path: string, exports: unknown) => {
  const p = require.resolve(path);
  require.cache[p] = { id: p, filename: p, loaded: true, exports } as unknown as NodeModule;
};
stub("./prisma", { prisma: fakePrisma });
stub("./notify-admin", { notifyAdmin: async (n: Record<string, unknown>) => { emails.push(n); } });
stub("./require-admin", {
  requireAdminSession: async () => (signedIn ? null : Response.json({ error: "Unauthorized" }, { status: 401 })),
});

// after(): collect the callbacks and run them when the test says so, as Next does once the
// response has gone out.
let deferred: (() => Promise<void>)[];
require("next/server").after = (fn: () => Promise<void>) => { deferred.push(fn); };
const runAfter = async () => {
  while (deferred.length) await deferred.shift()!();
};

// ── Fake OMS and PayMongo, routed by URL ───────────────────────────────────────────────────

type Reply = { status: number; json: unknown } | "network-error";
let omsAvailability: Reply;
let omsOrders: Reply[]; // replies for POST /orders, in turn (intake always succeeds)
let paymongoSession: Reply;
let paymongoRefund: Reply;
let sessionOnPaymongo: Reply; // what GET /checkout_sessions/{id} answers
let sessionExpire: Reply; // what POST /checkout_sessions/{id}/expire answers
let onSessionFetch: (() => void) | null; // runs as PayMongo is asked (to stage a race)
let calls: { url: string; body: unknown }[];

globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
  const url = String(input);
  const body = init.body ? JSON.parse(init.body as string) : null;
  calls.push({ url, body });
  const reply: Reply =
    url.includes("/products/availability") ? omsAvailability
    : url.endsWith("/intake") ? { status: 201, json: { customerId: "cus_1" } }
    : url.endsWith("/orders") ? omsOrders.shift() ?? { status: 500, json: { error: "internal_error" } }
    : url.endsWith("/checkout_sessions") ? paymongoSession
    : url.includes("/expire") ? sessionExpire
    : url.includes("/checkout_sessions/cs_") ? (onSessionFetch?.(), sessionOnPaymongo)
    : url.endsWith("/refunds") ? paymongoRefund
    : { status: 404, json: {} };
  if (reply === "network-error") throw new TypeError("fetch failed");
  return new Response(JSON.stringify(reply.json), { status: reply.status, headers: { "X-Total-Count": "2" } });
}) as unknown as typeof fetch;

let logs: string[];
for (const level of ["info", "warn", "error"] as const) console[level] = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };

const checkout = require("../app/api/checkout/route") as { POST: (r: NextRequest) => Promise<Response> };
const status = require("../app/api/checkout/status/route") as { GET: (r: NextRequest) => Promise<Response> };
const cancel = require("../app/api/checkout/cancel/route") as { POST: (r: NextRequest) => Promise<Response> };
const webhook = require("../app/api/paymongo/webhook/route") as { POST: (r: NextRequest) => Promise<Response> };
const confirm = require("../app/api/orders/[id]/confirm/route") as { POST: (r: NextRequest, c: unknown) => Promise<Response> };
const refund = require("../app/api/orders/[id]/refund/route") as { POST: (r: NextRequest, c: unknown) => Promise<Response> };
const orderRoute = require("../app/api/orders/[id]/route") as { PATCH: (r: NextRequest, c: unknown) => Promise<Response> };
const omsWebhook = require("../app/api/oms/webhook/route") as { POST: (r: NextRequest) => Promise<Response> };
const { clearAvailabilityCache } = require("./oms") as { clearAvailabilityCache: () => void };

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────

const KEY = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
const json = (url: string, body: unknown, method = "POST") =>
  new NextRequest(url, { method, headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

// Two lines: 150.00 × 3 and 200.00 × 1, Metro Manila fee 100.00 → 750.00.
const checkoutBody = (over: Record<string, unknown> = {}) => ({
  checkoutKey: KEY,
  items: [{ slug: "soap", qty: 3 }, { slug: "tea", qty: 1 }],
  customer: { name: "TEST Buyer", phone: "0917 000 0000", email: "test@example.com" },
  address: { street: "TEST 1 Sample St", barangay: "Poblacion", city: "Makati City", province: "Metro Manila", postalCode: "1200" },
  notes: "",
  paymentMethod: "online",
  expectedTotal: "750.00",
  privacyConsent: true,
  ...over,
});

const placeOnline = async (over: Record<string, unknown> = {}) => {
  const res = await checkout.POST(json("https://site.test/api/checkout", checkoutBody(over)));
  return { res, body: await res.json() };
};

const paidEvent = (amount = 75000, paymentId = "pay_1") =>
  JSON.stringify({
    data: {
      attributes: {
        type: "checkout_session.payment.paid",
        data: {
          id: "cs_1",
          attributes: {
            payment_method_used: "gcash",
            payments: [{ id: paymentId, attributes: { amount, currency: "PHP", paid_at: 1790000000, source: { type: "gcash" } } }],
          },
        },
      },
    },
  });

// Like PayMongo: the session (with its payment) is what GET returns; the signed event itself carries
// the session with an EMPTY payments list, because PayMongo attaches the payment after sending it.
const deliver = (full: string, secret = WEBHOOK_SECRET, paymongo: "attached" | "not_attached" | "unreachable" = "attached") => {
  const parsed = JSON.parse(full);
  parsed.data.attributes.data.attributes.payments = [];
  sessionOnPaymongo =
    paymongo === "unreachable" ? "network-error"
    : { status: 200, json: { data: paymongo === "attached" ? JSON.parse(full).data.attributes.data : structuredClone(parsed.data.attributes.data) } };
  const raw = JSON.stringify(parsed);
  const t = "1790000000";
  const sig = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return webhook.POST(new NextRequest("https://site.test/api/paymongo/webhook", {
    method: "POST", headers: { "paymongo-signature": `t=${t},te=${sig},li=` }, body: raw,
  }));
};

// A session PayMongo holds with no payment. intentStatus: what its payment intent says.
const unpaidSession = (intentStatus = "awaiting_payment_method", id = "cs_1"): Reply => ({
  status: 200,
  json: { data: { id, attributes: { status: "active", payments: [], payment_intent: { attributes: { status: intentStatus, payments: [] } } } } },
});
// The same session with the payment attached, as GET answers once paid.
const paidSession = (): Reply => ({ status: 200, json: { data: JSON.parse(paidEvent()).data.attributes.data } });

// A signed paid event, with GET /checkout_sessions/{id} answering `onPaymongo`.
const webhookWith = (full: string, onPaymongo: Reply) => {
  const raw = JSON.stringify({ ...JSON.parse(full) });
  const t = "1790000000";
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${raw}`).digest("hex");
  sessionOnPaymongo = onPaymongo;
  return webhook.POST(new NextRequest("https://site.test/api/paymongo/webhook", {
    method: "POST", headers: { "paymongo-signature": `t=${t},te=${sig},li=` }, body: raw,
  }));
};

const omsBodies = () => calls.filter((c) => c.url.endsWith("/orders")).map((c) => c.body as Record<string, unknown>);
const order = () => orders[0];

beforeEach(() => {
  orders = [];
  items = [];
  webhookEvents = [];
  products = [
    { id: "p-soap", slug: "soap", name: "TEST Soap", price: decimal("150"), currency: "PHP", isActive: true, requiresPrescription: false, images: [] },
    { id: "p-tea", slug: "tea", name: "TEST Tea", price: decimal("200"), currency: "PHP", isActive: true, requiresPrescription: false, images: [] },
  ];
  omsAvailability = {
    status: 200,
    json: [
      { sku: "soap", available: 50, price: "150.00", currency: "PHP" },
      { sku: "tea", available: 50, price: "200.00", currency: "PHP" },
    ],
  };
  omsOrders = [{ status: 201, json: { orderId: "oms_ord_1", status: "PENDING_VERIFICATION", paymentStatus: "paid" } }];
  paymongoSession = { status: 200, json: { data: { id: "cs_1", attributes: { checkout_url: "https://checkout.paymongo.test/cs_1" } } } };
  paymongoRefund = { status: 200, json: { data: { id: "ref_1" } } };
  sessionOnPaymongo = unpaidSession();
  sessionExpire = { status: 200, json: { data: { id: "cs_1" } } };
  onSessionFetch = null;
  calls = [];
  emails = [];
  logs = [];
  deferred = [];
  signedIn = true;
  clearAvailabilityCache();
});

// ── Checkout ────────────────────────────────────────────────────────────────────────────────

test("online checkout saves AWAITING_PAYMENT and answers the PayMongo URL; line items add up (AC-2)", async () => {
  const { res, body } = await placeOnline();
  assert.equal(res.status, 201);
  assert.equal(body.data.checkoutUrl, "https://checkout.paymongo.test/cs_1");
  assert.equal(body.data.total, "750.00");

  const o = order();
  assert.equal(o.status, "AWAITING_PAYMENT");
  assert.equal(o.paymentMethod, "PREPAID");
  assert.equal(o.paymentStatus, "UNPAID");
  assert.equal(o.paymongoCheckoutId, "cs_1");
  const wait = (o.paymentExpiresAt as Date).getTime() - Date.now();
  assert.ok(wait > 59 * 60_000 && wait <= 60 * 60_000, "expires in 60 minutes");

  const session = calls.find((c) => c.url.endsWith("/checkout_sessions"))!.body as { data: { attributes: Record<string, unknown> } };
  const a = session.data.attributes;
  assert.deepEqual(a.line_items, [
    { name: "TEST Soap", amount: 15000, currency: "PHP", quantity: 3 },
    { name: "TEST Tea", amount: 20000, currency: "PHP", quantity: 1 },
    { name: "Delivery fee", amount: 10000, currency: "PHP", quantity: 1 },
  ]);
  assert.equal(a.success_url, `https://site.test/checkout/done?key=${KEY}`);
  assert.equal(a.cancel_url, `https://site.test/checkout?cancelled=${KEY}`);
  assert.equal((a.billing as { phone: string }).phone, "9170000000", "PayMongo adds its own +63");
  assert.equal(emails.length, 0, "the admin email waits for payment (AC-18)");
});

test("the same key again returns the same URL, one order, one session (AC-5)", async () => {
  await placeOnline();
  const { res, body } = await placeOnline();
  assert.equal(res.status, 200);
  assert.equal(body.data.checkoutUrl, "https://checkout.paymongo.test/cs_1");
  assert.equal(orders.length, 1);
  assert.equal(calls.filter((c) => c.url.endsWith("/checkout_sessions")).length, 1);
});

test("OMS unreachable: online is refused with online_unavailable and nothing saved (AC-3)", async () => {
  omsAvailability = "network-error";
  const { res, body } = await placeOnline({ expectedTotal: "750.00" });
  assert.equal(res.status, 409);
  assert.equal(body.code, "online_unavailable");
  assert.equal(orders.length, 0);
});

test("PayMongo down: the order is expired and the answer is 502 (AC-4)", async () => {
  paymongoSession = { status: 500, json: { errors: [{ detail: "boom" }] } };
  const { res, body } = await placeOnline();
  assert.equal(res.status, 502);
  assert.equal(body.code, "online_unavailable");
  assert.equal(order().status, "CANCELLED");
  assert.equal(order().paymentStatus, "EXPIRED");
});

test("COD checkout is unchanged: PENDING, COD, no session, admin email at once (AC-1)", async () => {
  const { res } = await placeOnline({ paymentMethod: "cod" });
  assert.equal(res.status, 201);
  assert.equal(order().status, "PENDING");
  assert.equal(order().paymentMethod, "COD");
  assert.equal(order().paymentStatus, undefined);
  assert.equal(calls.some((c) => c.url.includes("paymongo")), false);
  assert.equal(emails.length, 1);
});

// ── Webhook and automatic send ──────────────────────────────────────────────────────────────

test("a signed paid event marks it paid, answers 200, then sends it to the OMS prepaid (AC-7, AC-8)", async () => {
  await placeOnline();
  const res = await deliver(paidEvent());
  assert.equal(res.status, 200);
  assert.equal(order().paymentStatus, "PAID");
  assert.equal(order().status, "PENDING");
  assert.equal(order().paymongoPaymentId, "pay_1");
  assert.equal(order().paymentChannel, "gcash");
  assert.equal(omsBodies().length, 0, "the OMS send waits until after the answer");

  await runAfter();
  const sent = omsBodies()[0];
  assert.equal(sent.paymentMethod, "prepaid");
  assert.equal(sent.shippingFee, "100.00");
  assert.deepEqual(sent.payment, {
    amount: "750.00", currency: "PHP", provider: "paymongo", channel: "gcash", reference: "pay_1",
    paidAt: new Date(1790000000 * 1000).toISOString(),
  });
  assert.equal(order().status, "CONFIRMED");
  assert.equal(order().omsOrderId, "oms_ord_1");
  assert.equal(emails[0].kind, "order");
  assert.equal(emails[0].paidChannel, "gcash");
});

test("the success URL alone changes nothing; a bad signature is 401 (AC-6)", async () => {
  await placeOnline();
  const res = await status.GET(new NextRequest(`https://site.test/api/checkout/status?key=${KEY}`));
  assert.equal((await res.json()).data.state, "awaiting_payment");
  assert.equal((await deliver(paidEvent(), "wrong-secret")).status, 401);
  assert.equal(order().paymentStatus, "UNPAID");
});

test("payment not attached yet, or PayMongo unreachable: 503 so PayMongo retries, nothing written (real webhook shape)", async () => {
  await placeOnline();
  assert.equal((await deliver(paidEvent(), WEBHOOK_SECRET, "not_attached")).status, 503);
  assert.equal(order().paymentStatus, "UNPAID");
  assert.equal((await deliver(paidEvent(), WEBHOOK_SECRET, "unreachable")).status, 503);
  assert.equal(order().paymentStatus, "UNPAID");
  assert.equal((await deliver(paidEvent())).status, 200, "the retry, once attached, records it");
  assert.equal(order().paymentStatus, "PAID");
});

test("PayMongo 404 for the session, or a different session back: 200, an error log, nothing written (AC-6b)", async () => {
  await placeOnline();
  const event = paidEvent();
  const notFound = await webhookWith(event, { status: 404, json: { errors: [{ detail: "No such checkout_session." }] } });
  assert.equal(notFound.status, 200);
  assert.ok(logs.some((l) => l.includes("session_not_found")));
  const other = await webhookWith(event, unpaidSession("succeeded", "cs_other"));
  assert.equal(other.status, 200);
  assert.ok(logs.some((l) => l.includes("session_mismatch")));
  assert.equal(order().paymentStatus, "UNPAID");
  assert.equal(order().paymongoPaymentId, undefined);
});

test("the same paid event twice records one payment and one send (AC-9)", async () => {
  await placeOnline();
  await deliver(paidEvent());
  await deliver(paidEvent());
  await runAfter();
  assert.equal(omsBodies().length, 1);
  assert.equal(emails.filter((e) => e.kind === "order").length, 1);
});

test("OMS down: stays PAID, not sent; the repeat event and the admin button retry byte identically (AC-10, AC-19)", async () => {
  omsOrders = [{ status: 503, json: { error: "internal_error" } }, { status: 503, json: {} }];
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();
  assert.equal(order().paymentStatus, "PAID");
  assert.equal(order().status, "PENDING");
  assert.match(order().omsSendError as string, /temporarily unavailable/);

  await deliver(paidEvent()); // PayMongo repeats it: the send is tried again
  await runAfter();
  assert.equal(order().omsOrderId, null);

  omsOrders = [{ status: 201, json: { orderId: "oms_ord_9" } }];
  const res = await confirm.POST(json("https://site.test/api/orders/ord-1/confirm", {}), params("ord-1"));
  assert.equal(res.status, 200);
  assert.equal(order().status, "CONFIRMED");
  assert.equal(order().omsSendError, null);
  const bodies = omsBodies().map((b) => JSON.stringify(b));
  assert.equal(new Set(bodies).size, 1, "every attempt sent the same bytes");
});

test("OMS refuses for good: REFUND_NEEDED with a plain message and a refund email (AC-11)", async () => {
  omsOrders = [{ status: 422, json: { error: "amount_mismatch", message: "expected 800.00, got 750.00" } }];
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();
  assert.equal(order().paymentStatus, "REFUND_NEEDED");
  assert.match(order().omsSendError as string, /differs from what the customer paid/);
  assert.equal(emails.some((e) => e.kind === "refund_needed"), true);
});

test("a paid amount that differs from the total never goes to the OMS (AC-7, AC-11)", async () => {
  await placeOnline();
  await deliver(paidEvent(70000));
  await runAfter();
  assert.equal(order().paymentStatus, "REFUND_NEEDED");
  assert.equal(omsBodies().length, 0);
  assert.equal(emails.some((e) => e.kind === "refund_needed"), true);
});

test("the OMS webhook confirming first never loses the OMS ids (AC-8)", async () => {
  await placeOnline();
  await deliver(paidEvent());
  order().status = "CONFIRMED"; // the OMS status webhook landed between the OMS reply and our write
  await runAfter();
  assert.equal(order().omsOrderId, "oms_ord_1");
  assert.equal(order().status, "CONFIRMED");
});

test("the OMS cancelling a paid order flags it for refund (AC-11b)", async () => {
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();
  const raw = JSON.stringify({
    event: "order.status_changed", eventId: "evt_1", occurredAt: new Date().toISOString(),
    orderId: "oms_ord_1", externalRef: order().orderNumber, status: "CANCELLED",
  });
  const t = String(Math.floor(Date.now() / 1000));
  const sig = "sha256=" + createHmac("sha256", "oms-secret-not-real").update(`${t}.${raw}`).digest("hex");
  const res = await omsWebhook.POST(new NextRequest("https://site.test/api/oms/webhook", {
    method: "POST", headers: { "x-oms-timestamp": t, "x-oms-signature": sig, "x-oms-event-id": "evt_1" }, body: raw,
  }));
  assert.equal(res.status, 200);
  assert.equal(order().status, "CANCELLED");
  assert.equal(order().paymentStatus, "REFUND_NEEDED");
  assert.equal(emails.some((e) => e.kind === "refund_needed"), true);
});

// ── Expiry, cancel, late payment ────────────────────────────────────────────────────────────

test("past 60 minutes the status call expires it and the session; a late payment is still honoured (AC-13, AC-14)", async () => {
  await placeOnline();
  order().paymentExpiresAt = new Date(Date.now() - 1000);
  const res = await status.GET(new NextRequest(`https://site.test/api/checkout/status?key=${KEY}`));
  assert.equal((await res.json()).data.state, "expired");
  assert.equal(order().status, "CANCELLED");
  assert.ok(calls.some((c) => c.url.endsWith("/checkout_sessions/cs_1/expire")));

  await deliver(paidEvent());
  await runAfter();
  assert.equal(order().paymentStatus, "PAID");
  assert.equal(order().status, "CONFIRMED");
});

test("the status endpoint returns no personal data (AC-16)", async () => {
  await placeOnline();
  const body = await (await status.GET(new NextRequest(`https://site.test/api/checkout/status?key=${KEY}`))).json();
  assert.deepEqual(Object.keys(body.data).sort(), ["orderNumber", "state", "total"]);
  assert.equal((await status.GET(new NextRequest("https://site.test/api/checkout/status?key=nope"))).status, 400);
});

test("cancel expires an unpaid order and leaves a paid one alone (AC-15)", async () => {
  await placeOnline();
  let res = await cancel.POST(json("https://site.test/api/checkout/cancel", { key: KEY }));
  assert.equal((await res.json()).data.state, "expired");

  orders = [];
  calls = [];
  await placeOnline();
  await deliver(paidEvent());
  res = await cancel.POST(json("https://site.test/api/checkout/cancel", { key: KEY }));
  assert.equal((await res.json()).data.state, "paid");
});

// ── Check before expiry (AC-13b) ────────────────────────────────────────────────────────────

const stale = () => { order().paymentExpiresAt = new Date(Date.now() - 1000); };
const pollStatus = async () => (await (await status.GET(new NextRequest(`https://site.test/api/checkout/status?key=${KEY}`))).json()).data.state;
const sessionGets = () => calls.filter((c) => /\/checkout_sessions\/cs_[^/]+$/.test(c.url)).length;
const sessionExpires = () => calls.filter((c) => c.url.endsWith("/expire")).length;

test("paid on PayMongo but the webhook never came: the expiry check rescues it and sends it in after() (AC-13b)", async () => {
  await placeOnline();
  stale();
  sessionOnPaymongo = paidSession();
  assert.equal(await pollStatus(), "paid");
  assert.equal(order().status, "PENDING");
  assert.equal(order().paymongoPaymentId, "pay_1");
  assert.equal(sessionExpires(), 0, "a paid session is never expired");
  assert.ok(logs.some((l) => l.includes("rescued_paid")));
  assert.equal(omsBodies().length, 0, "the send waits for after()");
  await runAfter();
  assert.equal(order().status, "CONFIRMED");
  assert.equal(emails.filter((e) => e.kind === "order").length, 1);
});

test("no payment yet but the intent is succeeding, or PayMongo unreachable: deferred, rechecked after the 2 minute lease (AC-13b)", async () => {
  await placeOnline();
  for (const reply of [unpaidSession("succeeded"), unpaidSession("processing"), "network-error" as const, { status: 503, json: {} }]) {
    stale();
    sessionOnPaymongo = reply;
    const before = Date.now();
    assert.equal(await pollStatus(), "awaiting_payment");
    assert.equal(order().status, "AWAITING_PAYMENT");
    const lease = (order().paymentExpiresAt as Date).getTime() - before;
    assert.ok(lease >= 119_000 && lease <= 121_000, "paymentExpiresAt moved 2 minutes out");
  }
  assert.equal(sessionExpires(), 0);
  assert.ok(logs.some((l) => l.includes("expire_deferred")));
  const gets = sessionGets();
  await pollStatus(); // inside the lease: no second PayMongo call
  assert.equal(sessionGets(), gets);
});

test("PayMongo 404 for the session: expired without trying to expire the session (AC-13b)", async () => {
  await placeOnline();
  stale();
  sessionOnPaymongo = { status: 404, json: { errors: [] } };
  assert.equal(await pollStatus(), "expired");
  assert.equal(sessionExpires(), 0);
});

test("PayMongo refuses to expire the session (already paid): the order waits instead (AC-13b)", async () => {
  await placeOnline();
  stale();
  sessionExpire = { status: 400, json: { errors: [{ detail: "Checkout session is already paid." }] } };
  assert.equal(await pollStatus(), "awaiting_payment");
  assert.equal(order().status, "AWAITING_PAYMENT");
});

test("the webhook wins the race during the check: recorded once, sent once (AC-13b, AC-9)", async () => {
  await placeOnline();
  stale();
  sessionOnPaymongo = paidSession();
  onSessionFetch = () => {
    onSessionFetch = null;
    Object.assign(order(), { status: "PENDING", paymentStatus: "PAID", paymongoPaymentId: "pay_1", paidAmount: decimal("750.00"), paidAt: new Date(1790000000 * 1000), paymentChannel: "gcash" });
  };
  assert.equal(await pollStatus(), "paid");
  await runAfter();
  assert.equal(omsBodies().length, 0, "the check sends nothing; the webhook owns the send");
  assert.equal(logs.some((l) => l.includes("rescued_paid")), false);
});

test("two checks at once: the lease lets only one ask PayMongo (AC-13b)", async () => {
  await placeOnline();
  stale();
  sessionOnPaymongo = "network-error";
  await Promise.all([pollStatus(), pollStatus()]);
  assert.equal(sessionGets(), 1);
});

test("cancel link: paid on PayMongo is rescued; unreachable waits; both keep the order (AC-15, AC-13b)", async () => {
  await placeOnline();
  sessionOnPaymongo = "network-error";
  let res = await cancel.POST(json("https://site.test/api/checkout/cancel", { key: KEY }));
  assert.equal((await res.json()).data.state, "awaiting_payment");

  order().paymentExpiresAt = new Date(Date.now() - 1000); // the lease has run out
  sessionOnPaymongo = paidSession();
  res = await cancel.POST(json("https://site.test/api/checkout/cancel", { key: KEY }));
  assert.equal((await res.json()).data.state, "paid");
  assert.equal(sessionExpires(), 0);
});

test("a repeat submit past the 60 minute window gets the payment state, not a dead link (AC-5)", async () => {
  await placeOnline();
  order().createdAt = new Date(Date.now() - 61 * 60_000);
  stale();
  sessionOnPaymongo = "network-error"; // deferred: stays AWAITING_PAYMENT, lease moves paymentExpiresAt forward
  const { body } = await placeOnline();
  assert.equal(body.data.checkoutUrl, undefined);
  assert.equal(body.data.paymentState, "awaiting_payment");
  assert.equal(orders.length, 1);
});

test("the admin list answers first, then checks at most 5 stale orders (AC-13, AC-13b)", async () => {
  for (let i = 0; i < 7; i++) {
    orders.push({
      id: `stale-${i}`, orderNumber: `VS-TEST-${i}`, status: "AWAITING_PAYMENT", paymentStatus: "UNPAID",
      paymongoCheckoutId: `cs_${i}`, paymentExpiresAt: new Date(Date.now() - 1000), createdAt: new Date(0), omsOrderId: null,
    });
  }
  sessionOnPaymongo = { status: 404, json: { errors: [] } };
  const list = require("../app/api/orders/route") as { GET: (r: NextRequest) => Promise<Response> };
  const res = await list.GET(new NextRequest("https://site.test/api/orders"));
  assert.equal(res.status, 200);
  assert.equal(sessionGets(), 0, "nothing asked before the answer");
  await runAfter();
  assert.equal(sessionGets(), 5);
  assert.equal(orders.filter((o) => o.paymentStatus === "EXPIRED").length, 5);
});

// ── Admin ───────────────────────────────────────────────────────────────────────────────────

test("refund through PayMongo, then a second click is 409 (AC-12)", async () => {
  omsOrders = [{ status: 422, json: { error: "product_inactive" } }];
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();

  let res = await refund.POST(json("https://site.test/api/orders/ord-1/refund", {}), params("ord-1"));
  assert.equal(res.status, 200);
  assert.equal(order().paymentStatus, "REFUNDED");
  assert.equal(order().status, "CANCELLED");
  assert.equal(order().refundId, "ref_1");
  const refundBody = calls.find((c) => c.url.endsWith("/refunds"))!.body as { data: { attributes: { amount: number } } };
  assert.equal(refundBody.data.attributes.amount, 75000);

  res = await refund.POST(json("https://site.test/api/orders/ord-1/refund", {}), params("ord-1"));
  assert.equal(res.status, 409);
  assert.equal(calls.filter((c) => c.url.endsWith("/refunds")).length, 1);
});

test("PayMongo refuses the refund: 422 with its reason, then a manual refund with a note (AC-12)", async () => {
  omsOrders = [{ status: 422, json: { error: "unknown_sku" } }];
  paymongoRefund = { status: 400, json: { errors: [{ detail: "This payment method can't be refunded." }] } };
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();

  let res = await refund.POST(json("https://site.test/api/orders/ord-1/refund", {}), params("ord-1"));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).error, "This payment method can't be refunded.");
  assert.equal((await refund.POST(json("https://site.test/api/orders/ord-1/refund", { manual: true, note: " " }), params("ord-1"))).status, 400);

  res = await refund.POST(json("https://site.test/api/orders/ord-1/refund", { manual: true, note: "BDO transfer TEST-123" }), params("ord-1"));
  assert.equal(res.status, 200);
  assert.equal(order().paymentStatus, "REFUNDED");
  assert.equal(order().refundId, null);
  assert.match(order().adminNotes as string, /Manual refund .* BDO transfer TEST-123/);
});

test("admin locks: no status change while awaiting payment, no cancel on a paid order, no send before payment (AC-17, AC-19)", async () => {
  omsOrders = [{ status: 503, json: {} }];
  await placeOnline();
  let res = await orderRoute.PATCH(json("https://site.test/api/orders/ord-1", { status: "CANCELLED" }, "PATCH"), params("ord-1"));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /waiting for online payment/);
  res = await confirm.POST(json("https://site.test/api/orders/ord-1/confirm", {}), params("ord-1"));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "This order hasn't been paid yet.");

  await deliver(paidEvent());
  await runAfter();
  res = await orderRoute.PATCH(json("https://site.test/api/orders/ord-1", { status: "CANCELLED" }, "PATCH"), params("ord-1"));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /Refund this order instead/);
});

test("the refund route is admin only", async () => {
  signedIn = false;
  assert.equal((await refund.POST(json("https://site.test/api/orders/ord-1/refund", {}), params("ord-1"))).status, 401);
});

test("payment logs never carry a name, phone, email or address (AC-20)", async () => {
  await placeOnline();
  await deliver(paidEvent());
  await runAfter();
  const all = logs.join("\n");
  for (const secret of ["TEST Buyer", "0917", "test@example.com", "Sample St"]) assert.equal(all.includes(secret), false, secret);
});
