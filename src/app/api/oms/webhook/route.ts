import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getOmsOrder } from "@/lib/oms";
import { prisma } from "@/lib/prisma";

// POST /api/oms/webhook  (called by the OMS, not by a browser)
//
// The OMS sends a signed message whenever an order's status changes, a courier reports progress, or
// OMS staff correct the delivery address (order.address_changed, VS-250).
// Each message carries three headers: X-OMS-Timestamp, X-OMS-Signature (sha256=<hex>) and
// X-OMS-Event-Id. The signature is HMAC SHA256, keyed with OMS_WEBHOOK_SIGNING_SECRET, over the text
// `<timestamp>.<raw body>`. The OMS repo documents the recipe in openapi.yaml under x-webhooks.
//
// Delivery is at least once and not in order: the same eventId can arrive twice, and a later
// change can arrive before an earlier one (compare occurredAt).

const MAX_CLOCK_SKEW_SECONDS = 300;

// OMS order status -> storefront OrderStatus. null = the OMS has a status the storefront has no
// equivalent for yet: the event is recorded but the order is left alone.
const STATUS_MAP = new Map<string, OrderStatus | null>([
  ["PENDING_VERIFICATION", "CONFIRMED"],
  ["APPROVED", "CONFIRMED"],
  ["ALLOCATED", "CONFIRMED"],
  ["PACKED", "PROCESSING"],
  ["SHIPPED", "OUT_FOR_DELIVERY"],
  ["DELIVERED", "DELIVERED"],
  ["CANCELLED", "CANCELLED"],
  ["REJECTED", "CANCELLED"],
  ["FAILED_DELIVERY", null],
  ["RETURNED", null],
]);

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
    orderId?: string;
    externalRef?: string;
    status?: string;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!event || typeof event !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });

  // The signature is valid from here on. Apply the event, and answer 2xx ONLY once what should be
  // saved has been saved (or there is genuinely nothing to save): any other answer makes the OMS
  // retry. Logs carry the eventId and the outcome only, never the body.
  const { event: type, eventId, occurredAt, orderId, externalRef, status } = event;
  const isOrderEvent = type === "order.status_changed";
  const isAddressEvent = type === "order.address_changed";
  if (!isOrderEvent && !isAddressEvent && type !== "shipment.updated") {
    // A signed event type this code doesn't handle: not a reason for the OMS to retry for 21 hours.
    console.info(JSON.stringify({ event: "oms_webhook", eventId: typeof eventId === "string" ? eventId : null, outcome: "ignored" }));
    return NextResponse.json({ ok: true, outcome: "ignored" }, { status: 200 });
  }
  const at = new Date(occurredAt ?? "");
  if (
    typeof eventId !== "string" || !eventId ||
    typeof externalRef !== "string" || !externalRef ||
    Number.isNaN(at.getTime()) ||
    (isOrderEvent && !STATUS_MAP.has(status ?? "")) ||
    (isAddressEvent && (typeof orderId !== "string" || !orderId))
  ) {
    // A known event type with a bad shape, or a status this code doesn't know yet. 4xx keeps it
    // visible as a failed delivery on the OMS side instead of silently dropping it.
    console.warn(JSON.stringify({ event: "oms_webhook", eventId: eventId ?? null, outcome: "unhandled" }));
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const respond = (outcome: string) => {
    console.info(JSON.stringify({ event: "oms_webhook", eventId, outcome }));
    return NextResponse.json({ ok: true, outcome }, { status: 200 });
  };

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: externalRef },
      select: { id: true, omsOrderId: true, customerAddress: true },
    });
    // Not the OMS's fault and a retry would not help, so 2xx.
    if (!order) return respond("unknown_order");
    if (isAddressEvent && order.omsOrderId && order.omsOrderId !== orderId) return respond("order_mismatch");

    if (await prisma.omsWebhookEvent.findUnique({ where: { eventId } })) return respond("duplicate");

    if (isAddressEvent) {
      // The event never carries the address: read what the OMS holds NOW. Pings can arrive out of
      // order, but the latest read is always right, so no occurredAt / omsLastEventAt check here.
      // This deliberately bypasses the VS-248 PATCH lock: the OMS is the one allowed path.
      const read = await getOmsOrder(orderId!, { baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY });
      if (!read.ok && read.reason !== "not_found") {
        // Save nothing and answer 500 so the OMS retries. A 401 means our OMS_API_KEY is wrong.
        console.error(JSON.stringify({ event: "oms_webhook", eventId, outcome: read.reason === "auth" ? "oms_auth" : "oms_read_failed", reason: read.reason }));
        return NextResponse.json({ error: "failed to read the OMS order" }, { status: 500 });
      }
      const outcome = await prisma.$transaction(async (tx) => {
        // 404: the OMS doesn't know this order for our key. A retry would not help; record it.
        if (!read.ok) {
          await tx.omsWebhookEvent.create({ data: { eventId, type } });
          return "oms_order_not_found";
        }
        const unchanged = read.shippingAddress === order.customerAddress;
        if (!unchanged) await tx.order.update({ where: { id: order.id }, data: { customerAddress: read.shippingAddress } });
        await tx.omsWebhookEvent.create({ data: { eventId, type } });
        return unchanged ? "address_unchanged" : "address_updated";
      });
      return respond(outcome);
    }

    // shipment.updated carries the courier's own status: recorded, never mapped to an order status.
    const newStatus = isOrderEvent ? STATUS_MAP.get(status ?? "") : null;

    const outcome = await prisma.$transaction(async (tx) => {
      if (newStatus) {
        // Compare-and-set on omsLastEventAt, so an older event can't overwrite a newer one even when
        // two deliveries race. count 0 means a newer event was already applied.
        const { count } = await tx.order.updateMany({
          where: { id: order.id, OR: [{ omsLastEventAt: null }, { omsLastEventAt: { lte: at } }] },
          data: { status: newStatus, omsLastEventAt: at },
        });
        if (count === 0) return "stale";
      }
      await tx.omsWebhookEvent.create({ data: { eventId, type } });
      return newStatus ? "applied" : "recorded";
    });
    return respond(outcome);
  } catch (error: unknown) {
    // Same eventId committed by a concurrent delivery between our check and our insert.
    if ((error as { code?: string })?.code === "P2002") return respond("duplicate");
    // Never 2xx for something we did not save: 500 makes the OMS retry.
    console.error(JSON.stringify({ event: "oms_webhook", eventId, outcome: "db_error", code: (error as { code?: string })?.code ?? null }));
    return NextResponse.json({ error: "failed to save" }, { status: 500 });
  }
}
