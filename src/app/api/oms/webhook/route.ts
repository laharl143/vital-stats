import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// POST /api/oms/webhook  (called by the OMS, not by a browser)
//
// The OMS sends a signed message whenever an order's status changes or a courier reports progress.
// Each message carries three headers: X-OMS-Timestamp, X-OMS-Signature (sha256=<hex>) and
// X-OMS-Event-Id. The signature is HMAC SHA256, keyed with OMS_WEBHOOK_SIGNING_SECRET, over the text
// `<timestamp>.<raw body>`. The OMS repo documents the recipe in openapi.yaml under x-webhooks.
//
// Delivery is at least once and not in order: the same eventId can arrive twice, and a later
// change can arrive before an earlier one (compare occurredAt).

const MAX_CLOCK_SKEW_SECONDS = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.OMS_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Fail closed: without the secret nothing can be verified, so accept nothing. The OMS retries.
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // Read the RAW text before anything else. Parsing and re-serializing changes the bytes and the
  // signature would no longer match.
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-oms-timestamp");
  const signature = req.headers.get("x-oms-signature");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Refuse a timestamp more than 5 minutes off our own clock, so a captured message cannot be
  // replayed later.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 401 });
  }

  const expected =
    "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    eventId?: string;
    occurredAt?: string;
    externalRef?: string;
    status?: string;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // TODO: apply the event to the order. This is NOT done yet, and it needs a decision first.
  // Today the Order model has no field for the OMS order reference (externalRef / orderId), and
  // nowhere to remember the last eventId or occurredAt already applied. To do it safely:
  //   1. Store the OMS reference on Order, and the last applied occurredAt.
  //   2. Ignore an eventId already handled (a repeat), and ignore an event whose occurredAt is
  //      older than the last one applied (arrived out of order).
  //   3. Map the OMS status names (APPROVED, ALLOCATED, PACKED, SHIPPED, DELIVERED, ...) to
  //      OrderStatus here.
  //   4. Answer 2xx only after the change is saved. Any other answer makes the OMS retry.
  //
  // Until then this route only verifies and records that a message arrived. Do NOT register this
  // endpoint in the OMS before the steps above exist: a 2xx marks the message delivered, so events
  // received now would be lost.
  console.info(
    JSON.stringify({ event: "oms_webhook_received", type: event.event, eventId: event.eventId }),
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
