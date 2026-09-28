/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// Spec 0005: emailCustomer against a fake database and a fake Resend. Nothing here reaches the real
// database or sends a real email.

type Claim = { id: string; orderId: string; kind: string; sentAt?: Date; failedAt?: Date; error?: string };
type Sent = { payload: Record<string, string>; options: { idempotencyKey?: string } };

const decimal = (s: string) => ({ toFixed: (n: number) => Number(s).toFixed(n) });
const TOKEN = "A".repeat(43);
let order: Record<string, unknown> | null;
let claims: Claim[];
let sent: Sent[];
let resendError: { name: string; message: string } | null;
let logs: string[];

const p2002 = () => Object.assign(new Error("unique"), { code: "P2002" });
const fakePrisma = {
  order: { findUnique: async () => (order ? { ...order } : null) },
  customerEmail: {
    create: async ({ data }: { data: { orderId: string; kind: string } }) => {
      if (claims.some((c) => c.orderId === data.orderId && c.kind === data.kind)) throw p2002();
      const c = { id: `c${claims.length + 1}`, ...data };
      claims.push(c);
      return { id: c.id };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Claim> }) => {
      const c = claims.find((x) => x.id === where.id)!;
      Object.assign(c, data);
      return c;
    },
  },
};
class FakeResend {
  emails = {
    send: async (payload: Record<string, string>, options: { idempotencyKey?: string }) => {
      if (resendError) return { data: null, error: resendError };
      sent.push({ payload, options });
      return { data: { id: "em_1" }, error: null };
    },
  };
}
const stub = (path: string, exports: unknown) => {
  require.cache[path] = { id: path, filename: path, loaded: true, exports } as unknown as NodeModule;
};
stub(require.resolve("./prisma"), { prisma: fakePrisma });
stub(require.resolve("resend"), { Resend: FakeResend });
for (const level of ["info", "warn", "error"] as const) {
  console[level] = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
}

const { emailCustomer, emailForStatus } = require("./notify-customer") as typeof import("./notify-customer");
const { cityProvince, isStatusToken, makeStatusToken, manilaDate, paymentLine } = require("./order-status") as typeof import("./order-status");

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEXTAUTH_URL = "https://shop.test";
  order = {
    orderNumber: "VS-260928-TEST1", source: "STOREFRONT", customerEmail: "test.buyer@example.com", statusToken: TOKEN,
    status: "PENDING", paymentMethod: "COD", paymentStatus: null, paymentChannel: null, paidAmount: null,
    totalAmount: decimal("400"), createdAt: new Date(), items: [{ quantity: 2 }, { quantity: 1 }],
  };
  claims = [];
  sent = [];
  resendError = null;
  logs = [];
});

test("sends once: claims the row, sends with the idempotency key and the status link, marks it sent (AC-10, AC-11)", async () => {
  assert.equal(await emailCustomer("o1", "RECEIVED"), "sent");
  assert.equal(sent.length, 1);
  const { payload, options } = sent[0];
  assert.equal(payload.to, "test.buyer@example.com");
  assert.equal(payload.subject, "We got your order VS-260928-TEST1");
  assert.equal(options.idempotencyKey, "order-email/o1/RECEIVED");
  for (const body of [payload.html, payload.text]) {
    assert.ok(body.includes(`https://shop.test/orders/${TOKEN}`));
    assert.ok(body.includes("3 items"));
    assert.ok(body.includes("Cash on delivery"));
  }
  assert.ok(claims[0].sentAt);

  assert.equal(await emailCustomer("o1", "RECEIVED"), "already_sent", "a retry sends nothing");
  assert.equal(sent.length, 1);
});

test("logs carry the order number, kind and outcome only, never the token or email (AC-14)", async () => {
  await emailCustomer("o1", "RECEIVED");
  const all = logs.join("\n");
  assert.ok(all.includes("VS-260928-TEST1") && all.includes("RECEIVED") && all.includes("sent"));
  assert.ok(!all.includes(TOKEN) && !all.includes("example.com"));
});

test("a Resend error marks the claim failed with a short code and is never retried (AC-13)", async () => {
  resendError = { name: "validation_error", message: "the full provider body for test.buyer@example.com" };
  assert.equal(await emailCustomer("o1", "SHIPPED"), "failed");
  assert.ok(claims[0].failedAt);
  assert.equal(claims[0].error, "resend_validation_error");
  resendError = null;
  assert.equal(await emailCustomer("o1", "SHIPPED"), "already_sent");
  assert.equal(sent.length, 0);
  assert.ok(!logs.join("\n").includes("example.com"));
});

test("skipped with no claim: no API key, an admin order, no email, or no token (AC-9, AC-14)", async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal(await emailCustomer("o1", "RECEIVED"), "skipped");
  process.env.RESEND_API_KEY = "re_test";
  for (const over of [{ source: "ADMIN" }, { customerEmail: null }, { statusToken: null }]) {
    order = { ...order!, ...over };
    assert.equal(await emailCustomer("o1", "RECEIVED"), "skipped");
  }
  assert.equal(claims.length, 0);
  assert.equal(sent.length, 0);
});

test("cancelled: none for an expired unpaid online order; COD plain; paid adds the refund line (AC-9, AC-12)", async () => {
  order = { ...order!, paymentMethod: "PREPAID", paymentStatus: "EXPIRED", status: "CANCELLED" };
  assert.equal(await emailCustomer("o1", "CANCELLED"), "skipped");

  order = { ...order!, paymentMethod: "COD", paymentStatus: null };
  assert.equal(await emailCustomer("o1", "CANCELLED"), "sent");
  assert.ok(!sent[0].payload.text.includes("refund"));

  claims = [];
  order = { ...order!, paymentMethod: "PREPAID", paymentStatus: "REFUND_NEEDED", paidAmount: decimal("400"), paymentChannel: "gcash" };
  assert.equal(await emailCustomer("o1", "CANCELLED"), "sent");
  assert.ok(sent[1].payload.text.includes("We'll refund your payment of ₱400.00."));
});

test("refunded names the amount and channel (AC-12)", async () => {
  order = { ...order!, paymentMethod: "PREPAID", paymentStatus: "REFUNDED", paidAmount: decimal("400"), paymentChannel: "gcash", status: "CANCELLED" };
  await emailCustomer("o1", "REFUNDED");
  assert.equal(sent[0].payload.subject, "Your refund for order VS-260928-TEST1");
  assert.ok(sent[0].payload.text.includes("₱400.00 was refunded to your GCash."));
});

test("emailForStatus maps only shipped, delivered and cancelled (AC-9)", async () => {
  assert.equal(await emailForStatus("o1", "CONFIRMED"), "skipped");
  assert.equal(await emailForStatus("o1", "PROCESSING"), "skipped");
  assert.equal(claims.length, 0);
  await emailForStatus("o1", "OUT_FOR_DELIVERY");
  await emailForStatus("o1", "DELIVERED");
  assert.deepEqual(claims.map((c) => c.kind), ["SHIPPED", "DELIVERED"]);
});

test("order-status helpers: token shape, address trimming, COD payment line (AC-1, AC-5, AC-7)", () => {
  const t = makeStatusToken();
  assert.ok(isStatusToken(t));
  assert.ok(!isStatusToken(t.slice(1)) && !isStatusToken(`${t.slice(1)}!`));

  assert.deepEqual(cityProvince("Unit 5B, 123 Rizal St, San Isidro, Makati City, Metro Manila 1200"), { city: "Makati City", province: "Metro Manila" });
  assert.equal(cityProvince("2 New St, Taguig"), null);
  assert.equal(manilaDate(new Date("2026-09-27T17:30:00Z")), "28 Sep 2026", "Manila is UTC+8");

  const cod = { status: "PENDING", paymentStatus: null, paymentChannel: null, paidAmount: null, totalAmount: decimal("1299.9") };
  assert.equal(paymentLine(cod), "Pay ₱1,299.90 in cash when it arrives.");
  assert.equal(paymentLine({ ...cod, status: "DELIVERED" }), "Paid in cash on delivery.");
  assert.equal(paymentLine({ ...cod, status: "CANCELLED" }), "Nothing to pay.");
  assert.equal(paymentLine({ ...cod, paymentStatus: "PAID", paymentChannel: "qrph" }), "Paid online (QR Ph)");
});
