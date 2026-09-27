import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { createCheckoutSession, createRefund, expireCheckoutSession, getCheckoutSession, paidEventSessionId, parsePaidSession, toChannel, verifySignature } from "./paymongo";

// Spec 0004. Every test uses a fake fetch; nothing here may ever reach PayMongo.

const SECRET = "whsk_test_not_real";
const sign = (body: string, t = "1700000000", secret = SECRET) =>
  createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

function fakeFetch(reply: { status: number; json: unknown } | "network-error") {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (reply === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(reply.json), { status: reply.status });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

test("verifySignature: te for a test key, li for a live key; wrong or missing fails (AC-6)", () => {
  const body = '{"data":{}}';
  const good = sign(body);
  const opts = { webhookSecret: SECRET, secretKey: "sk_test_x" };
  assert.equal(verifySignature(body, `t=1700000000,te=${good},li=`, opts), true);
  assert.equal(verifySignature(body, `t=1700000000,te=,li=${good}`, opts), false, "a test key never trusts li");
  assert.equal(verifySignature(body, `t=1700000000,te=,li=${good}`, { ...opts, secretKey: "sk_live_x" }), true);
  assert.equal(verifySignature(body, `t=1700000000,te=${good},li=`, { ...opts, secretKey: "sk_live_x" }), false);
  assert.equal(verifySignature(body + " ", `t=1700000000,te=${good}`, opts), false, "body changed");
  assert.equal(verifySignature(body, `t=1700000001,te=${good}`, opts), false, "timestamp changed");
  assert.equal(verifySignature(body, `t=1700000000,te=${sign(body, "1700000000", "other")}`, opts), false);
  assert.equal(verifySignature(body, null, opts), false);
  assert.equal(verifySignature(body, "garbage", opts), false);
});

const paidEvent = (over: Record<string, unknown> = {}, source: unknown = { type: "gcash" }) => ({
  data: {
    attributes: {
      type: "checkout_session.payment.paid",
      data: {
        id: "cs_test_1",
        attributes: {
          payment_method_used: "gcash",
          payments: [{ id: "pay_test_1", attributes: { amount: 40000, currency: "PHP", paid_at: 1700000000, source, ...over } }],
        },
      },
    },
  },
});

// The session as GET /checkout_sessions/{id} returns it (the payment is attached by then).
const session = (over: Record<string, unknown> = {}, source: unknown = { type: "gcash" }) => paidEvent(over, source).data.attributes.data;

test("paidEventSessionId: the session id of a paid event; other events null; no id is bad", () => {
  const real = paidEvent();
  (real.data.attributes.data.attributes as Record<string, unknown>).payments = []; // as PayMongo really sends it
  assert.equal(paidEventSessionId(real), "cs_test_1");
  assert.equal(paidEventSessionId({ data: { attributes: { type: "payment.failed" } } }), null);
  assert.equal(paidEventSessionId(null), null);
  assert.deepEqual(paidEventSessionId({ data: { attributes: { type: "checkout_session.payment.paid", data: {} } } }), { bad: "session.id" });
});

test("parsePaidSession reads session, payment, amount, currency, channel and paidAt", () => {
  assert.deepEqual(parsePaidSession(session()), {
    checkoutId: "cs_test_1", paymentId: "pay_test_1", amountCentavos: 40000, currency: "PHP",
    channel: "gcash", paidAt: new Date(1700000000 * 1000),
  });
});

test("parsePaidSession: an empty payments list falls back to payment_intent.payments; none at all is bad", () => {
  const sess = session();
  const s = sess.attributes as Record<string, unknown>;
  const payments = s.payments;
  s.payments = [];
  s.payment_intent = { id: "pi_1", type: "payment_intent", attributes: { amount: 40000, currency: "PHP", payments } };
  assert.equal((parsePaidSession(sess) as { paymentId: string }).paymentId, "pay_test_1");
  s.payment_intent = { attributes: { payments: [] } };
  assert.deepEqual(parsePaidSession(sess), { bad: "payment.id(direct:0,nested:0)" });
});

test("parsePaidSession: channel from source.type first, then payment_method_used, then unknown", () => {
  assert.equal((parsePaidSession(session({}, { type: "paymaya" })) as { channel: string }).channel, "maya");
  assert.equal((parsePaidSession(session({}, undefined)) as { channel: string }).channel, "gcash");
  const noChannel = session({}, { type: "Bad Channel!" });
  (noChannel.attributes as Record<string, unknown>).payment_method_used = undefined;
  assert.equal((parsePaidSession(noChannel) as { channel: string }).channel, "unknown");
  assert.equal(toChannel("QRPH"), "qrph");
});

test("parsePaidSession: a broken payment is bad, naming the field", () => {
  assert.deepEqual(parsePaidSession(session({ amount: "400.00" })), { bad: "payment.amount(string)" });
  assert.deepEqual(parsePaidSession(session({ paid_at: undefined })), { bad: "payment.paid_at(undefined)" });
  assert.deepEqual(parsePaidSession(null), { bad: "session.id" });
});

test("getCheckoutSession GETs the session with Basic auth and returns its data", async () => {
  const { fetchFn, calls } = fakeFetch({ status: 200, json: { data: { id: "cs_1", attributes: {} } } });
  assert.deepEqual(await getCheckoutSession("cs_1", { secretKey: "sk_test", fetchFn }), { ok: true, value: { id: "cs_1", attributes: {} } });
  assert.equal(calls[0].url, "https://api.paymongo.com/v1/checkout_sessions/cs_1");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
});

test("createCheckoutSession sends unit prices, channels, return links and billing with Basic auth (AC-2)", async () => {
  const { fetchFn, calls } = fakeFetch({ status: 200, json: { data: { id: "cs_1", attributes: { checkout_url: "https://checkout.paymongo.test/cs_1" } } } });
  const res = await createCheckoutSession(
    {
      orderNumber: "VS-TEST-1",
      lines: [{ name: "TEST Soap", amount: 15000, quantity: 3 }, { name: "Delivery fee", amount: 10000, quantity: 1 }],
      successUrl: "https://site.test/checkout/done?key=k",
      cancelUrl: "https://site.test/checkout?cancelled=k",
      billing: { name: "TEST Buyer", email: "test@example.com", phone: "+639170000000" },
    },
    { secretKey: "sk_test_abc", fetchFn },
  );
  assert.deepEqual(res, { ok: true, value: { id: "cs_1", checkoutUrl: "https://checkout.paymongo.test/cs_1" } });
  assert.equal(calls[0].url, "https://api.paymongo.com/v1/checkout_sessions");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("sk_test_abc:").toString("base64")}`);
  const attrs = JSON.parse(calls[0].init.body as string).data.attributes;
  assert.deepEqual(attrs.line_items[0], { name: "TEST Soap", amount: 15000, currency: "PHP", quantity: 3 });
  assert.deepEqual(attrs.payment_method_types, ["card", "gcash", "paymaya", "grab_pay", "qrph", "dob"]);
  assert.equal(attrs.reference_number, "VS-TEST-1");
  assert.equal(attrs.send_email_receipt, false);
  assert.equal(attrs.billing.email, "test@example.com");
});

test("PayMongo failures come back as plain messages, never a throw", async () => {
  assert.equal((await createCheckoutSession({ orderNumber: "x", lines: [], successUrl: "", cancelUrl: "", billing: { name: "", email: "", phone: "" } }, { secretKey: undefined })).ok, false);
  const down = await expireCheckoutSession("cs_1", { secretKey: "sk_test", fetchFn: fakeFetch("network-error").fetchFn });
  assert.deepEqual(down, { ok: false, message: "Couldn't reach PayMongo. Please try again.", permanent: false });
  const refused = await createRefund(
    { paymentId: "pay_1", amountCentavos: 40000, orderNumber: "VS-1" },
    { secretKey: "sk_test", fetchFn: fakeFetch({ status: 400, json: { errors: [{ code: "x", detail: "This payment method can't be refunded." }] } }).fetchFn },
  );
  assert.deepEqual(refused, { ok: false, message: "This payment method can't be refunded.", permanent: true });
});

test("only a 4xx a retry can't fix is permanent: 404 yes; 5xx, 429 and 401 no (AC-6b)", async () => {
  const kind = async (status: number) => {
    const res = await getCheckoutSession("cs_1", { secretKey: "sk_test", fetchFn: fakeFetch({ status, json: { errors: [] } }).fetchFn });
    return !res.ok && res.permanent;
  };
  assert.equal(await kind(404), true);
  assert.equal(await kind(400), true);
  assert.equal(await kind(500), false);
  assert.equal(await kind(503), false);
  assert.equal(await kind(429), false);
  assert.equal(await kind(401), false);
});

test("createRefund sends the full amount in centavos for the payment (AC-12)", async () => {
  const { fetchFn, calls } = fakeFetch({ status: 200, json: { data: { id: "ref_1" } } });
  const res = await createRefund({ paymentId: "pay_1", amountCentavos: 40000, orderNumber: "VS-1" }, { secretKey: "sk_test", fetchFn });
  assert.deepEqual(res, { ok: true, value: { id: "ref_1" } });
  assert.deepEqual(JSON.parse(calls[0].init.body as string).data.attributes, { amount: 40000, payment_id: "pay_1", reason: "others", notes: "VitalStats order VS-1" });
});
