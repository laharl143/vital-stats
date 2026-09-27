// PayMongo client for online payment (VS-255, spec 0004). Hosted Checkout Sessions only: card and
// wallet details are typed on PayMongo's page and never reach this server (PCI SAQ A).
//
// Only PayMongo's own answer may say an order is paid: the signed webhook (see verifySignature,
// paidEventSessionId) or the check before expiry, both reading GET /checkout_sessions/{id}. Every
// call takes a fetchFn so tests never reach PayMongo. Never log request or response bodies: they
// hold names, emails and phone numbers.

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paymongo.com/v1";

// The channels offered at checkout. MariBank, GoTyme and other bank apps pay through qrph.
export const PAYMENT_METHOD_TYPES = ["card", "gcash", "paymaya", "grab_pay", "qrph", "dob"] as const;

export interface CheckoutLine {
  name: string;
  amount: number; // UNIT price in whole centavos; PayMongo multiplies by quantity
  quantity: number;
}

export interface CheckoutSessionInput {
  orderNumber: string;
  lines: CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
  billing: { name: string; email: string; phone: string };
}

interface Opts {
  secretKey: string | undefined;
  fetchFn?: typeof fetch;
}

// permanent: PayMongo answered a 4xx that retrying can't fix (spec 0004, AC-6b). A 401 (our key)
// and a 429 (rate limit) stay temporary, so a config fix or a pause lets the retry through.
export type PaymongoResult<T> = { ok: true; value: T } | { ok: false; message: string; permanent?: boolean };

const fail = (message: string, permanent = false) => ({ ok: false as const, message, permanent });

async function call(
  opts: Opts,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; message: string; permanent: boolean }> {
  if (!opts.secretKey) return fail("PayMongo isn't configured. Ask a developer to set PAYMONGO_SECRET_KEY.");
  let res: Response;
  try {
    res = await (opts.fetchFn ?? fetch)(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Basic auth: the secret key is the username, the password is empty.
        Authorization: `Basic ${Buffer.from(`${opts.secretKey}:`).toString("base64")}`,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      // ponytail: fixed 10s cap, no backoff; the customer or the admin retries by hand.
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return fail("Couldn't reach PayMongo. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) {
    // PayMongo answers { errors: [{ code, detail }] }. The detail is a plain sentence meant for
    // developers; it never repeats card data, so it is safe to show an admin.
    const errors = (json?.errors as { detail?: unknown }[] | undefined) ?? [];
    const detail = typeof errors[0]?.detail === "string" ? errors[0].detail : null;
    if (res.status === 401) return fail("PayMongo refused our secret key. Ask a developer to check PAYMONGO_SECRET_KEY.");
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
    return fail(detail ?? `PayMongo answered with an error (${res.status}). Please try again.`, permanent);
  }
  return { ok: true, json };
}

const dataOf = (json: Record<string, unknown>) =>
  (json.data ?? null) as { id?: unknown; attributes?: Record<string, unknown> } | null;

export async function createCheckoutSession(
  input: CheckoutSessionInput,
  opts: Opts,
): Promise<PaymongoResult<{ id: string; checkoutUrl: string }>> {
  const res = await call(opts, "POST", "/checkout_sessions", {
    data: {
      attributes: {
        line_items: input.lines.map((l) => ({ name: l.name, amount: l.amount, currency: "PHP", quantity: l.quantity })),
        payment_method_types: PAYMENT_METHOD_TYPES,
        reference_number: input.orderNumber,
        description: `VitalStats order ${input.orderNumber}`,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        billing: input.billing,
        send_email_receipt: false,
        show_line_items: true,
      },
    },
  });
  if (!res.ok) return res;
  const data = dataOf(res.json);
  const url = data?.attributes?.checkout_url;
  if (typeof data?.id !== "string" || typeof url !== "string") return fail("PayMongo sent back an unexpected reply.");
  return { ok: true, value: { id: data.id, checkoutUrl: url } };
}

// Best effort: a session that stays open is harmless, since a late payment is still honoured.
export async function expireCheckoutSession(id: string, opts: Opts): Promise<PaymongoResult<null>> {
  const res = await call(opts, "POST", `/checkout_sessions/${encodeURIComponent(id)}/expire`);
  return res.ok ? { ok: true, value: null } : res;
}

export async function createRefund(
  input: { paymentId: string; amountCentavos: number; orderNumber: string },
  opts: Opts,
): Promise<PaymongoResult<{ id: string }>> {
  const res = await call(opts, "POST", "/refunds", {
    data: {
      attributes: {
        amount: input.amountCentavos,
        payment_id: input.paymentId,
        reason: "others",
        notes: `VitalStats order ${input.orderNumber}`,
      },
    },
  });
  if (!res.ok) return res;
  const id = dataOf(res.json)?.id;
  return typeof id === "string" ? { ok: true, value: { id } } : fail("PayMongo sent back an unexpected reply.");
}

// Paymongo-Signature: t=<unix seconds>,te=<test hmac>,li=<live hmac>. The HMAC SHA256 is over
// `<t>.<raw body>`, keyed with the webhook secret. A live secret key checks li, anything else te.
// No timestamp window: every write the webhook makes is idempotent, so a replay can do no harm,
// while a strict window could reject PayMongo's own delayed retries (spec 0004).
export function verifySignature(rawBody: string, header: string | null, opts: { webhookSecret: string; secretKey: string | undefined }): boolean {
  if (!header) return false;
  const parts = new Map(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = parts.get("t");
  const given = parts.get(opts.secretKey?.startsWith("sk_live_") ? "li" : "te");
  if (!t || !given) return false;
  const expected = createHmac("sha256", opts.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaidEvent {
  checkoutId: string; // cs_…
  paymentId: string; // pay_…
  amountCentavos: number;
  currency: string;
  channel: string; // lowercase, safe for the OMS pattern
  paidAt: Date;
}

const CHANNEL = /^[a-z0-9_]{1,40}$/;

// Lowercase, paymaya shown as maya, anything that wouldn't pass the OMS channel pattern → unknown.
export function toChannel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toLowerCase();
  if (c === "paymaya") return "maya";
  return CHANNEL.test(c) ? c : null;
}

// The paid event only says WHICH session was paid: PayMongo sends it before the payment record is
// attached, so the session's payments list is empty in the event (seen on real test payments,
// VS-255). Returns the session id for a checkout_session.payment.paid event, null for any other
// event type (answered 200 and ignored), or { bad } when the id is missing (answered 400).
export function paidEventSessionId(body: unknown): string | null | { bad: string } {
  const attrs = (body as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes;
  if (attrs?.type !== "checkout_session.payment.paid") return null;
  const id = (attrs.data as { id?: unknown } | undefined)?.id;
  return typeof id === "string" && id.startsWith("cs_") ? id : { bad: "session.id" };
}

// Reads the payment from a checkout session fetched from PayMongo (GET /checkout_sessions/{id}).
// Returns { bad } naming the first missing field; the field name is safe to log, the values never
// are. A missing payment usually means PayMongo hasn't attached it yet, so the caller retries.
export function parsePaidSession(data: unknown): PaidEvent | { bad: string } {
  const session = data as { id?: unknown; attributes?: Record<string, unknown> } | undefined;
  type Payment = { id?: unknown; attributes?: Record<string, unknown> };
  const intent = session?.attributes?.payment_intent as { attributes?: { payments?: unknown } } | undefined;
  const direct = session?.attributes?.payments as Payment[] | undefined;
  const nested = intent?.attributes?.payments as Payment[] | undefined;
  const payments = direct?.length ? direct : nested ?? direct;
  const payment = payments?.[0];
  const p = payment?.attributes;
  const missing =
    typeof session?.id !== "string" ? "session.id"
    : typeof payment?.id !== "string" ? `payment.id(direct:${direct?.length ?? "none"},nested:${nested?.length ?? "none"})`
    : !p ? "payment.attributes"
    : !Number.isInteger(p.amount) ? `payment.amount(${typeof p.amount})`
    : typeof p.currency !== "string" ? "payment.currency"
    : typeof p.paid_at !== "number" ? `payment.paid_at(${typeof p.paid_at})`
    : null;
  if (missing || !p) return { bad: missing ?? "payment.attributes" };
  // source.type first, the session's payment_method_used only when it is missing (spec 0004).
  const channel =
    toChannel((p.source as { type?: unknown } | undefined)?.type) ??
    toChannel(session!.attributes?.payment_method_used) ??
    "unknown";
  return {
    checkoutId: session!.id as string,
    paymentId: payment!.id as string,
    amountCentavos: p.amount as number,
    currency: (p.currency as string).toUpperCase(),
    channel,
    paidAt: new Date((p.paid_at as number) * 1000),
  };
}

// The session as PayMongo holds it now: the source of truth for the payment (see above).
export async function getCheckoutSession(id: string, opts: Opts): Promise<PaymongoResult<unknown>> {
  const res = await call(opts, "GET", `/checkout_sessions/${encodeURIComponent(id)}`);
  return res.ok ? { ok: true, value: res.json.data } : res;
}
