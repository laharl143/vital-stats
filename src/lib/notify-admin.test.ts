/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// Spec 0003, AC-18: the new "order" admin email. Resend and the database are faked; nothing is sent.

let sent: { to: string[]; subject: string; html: string }[];
let resendError: { name: string; message: string } | null;

process.env.RESEND_API_KEY = "re_test_key";
process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.test, owner@example.test";

require.cache[require.resolve("resend")] = {
  id: "resend", filename: "resend", loaded: true,
  exports: {
    Resend: class {
      emails = {
        send: async (m: { to: string[]; subject: string; html: string }) => {
          sent.push(m);
          return { error: resendError };
        },
      };
    },
  },
} as unknown as NodeModule;
require.cache[require.resolve("./prisma")] = {
  id: "prisma", filename: "prisma", loaded: true, exports: { prisma: {} },
} as unknown as NodeModule;

const { notifyAdmin } = require("./notify-admin") as typeof import("./notify-admin");

const orderNote = (over: Record<string, unknown> = {}) => ({
  kind: "order" as const, orderNumber: "VS-260927-TEST1", customerName: "TEST Juan Dela Cruz",
  phone: "+639171234567", itemCount: 3, total: "₱550.00", ...over,
});

beforeEach(() => {
  sent = [];
  resendError = null;
});

test("order email: one message to every configured admin, subject names the order and customer (covers AC-18)", async () => {
  await notifyAdmin(orderNote());

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["ops@example.test", "owner@example.test"]);
  assert.match(sent[0].subject, /Online order VS-260927-TEST1: TEST Juan Dela Cruz$/);
});

test("order email: body lists order, name, phone, items, total and cash on delivery, and links to admin orders (covers AC-18)", async () => {
  await notifyAdmin(orderNote());
  const html = sent[0].html;

  for (const text of ["VS-260927-TEST1", "TEST Juan Dela Cruz", "+639171234567", ">3<", "₱550.00", "Cash on delivery", "/admin/orders"]) {
    assert.ok(html.includes(text), `missing ${text}`);
  }
});

test("order email: customer text is HTML escaped", async () => {
  await notifyAdmin(orderNote({ customerName: `TEST <img src=x onerror="alert(1)">` }));
  const html = sent[0].html;

  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

test("a Resend error is thrown so the caller can log it", async () => {
  resendError = { name: "validation_error", message: "bad from" };
  await assert.rejects(notifyAdmin(orderNote()), /Resend API error: validation_error/);
});
