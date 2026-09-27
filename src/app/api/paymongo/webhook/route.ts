import { NextRequest, NextResponse, after } from "next/server";
import { markPaid, settlePaid } from "@/lib/paid-order";
import { getCheckoutSession, paidEventSessionId, parsePaidSession, verifySignature } from "@/lib/paymongo";

// POST /api/paymongo/webhook  (called by PayMongo, not by a browser; VS-255, spec 0004)
//
// Where PayMongo tells us an order is paid (the check before expiry in paid-order.ts is the only
// other way, AC-13b). PayMongo signs each message in the Paymongo-Signature
// header (see verifySignature). We answer 200 as soon as the payment is recorded, then send the
// order to the OMS inside after(), so PayMongo never waits on the OMS. A repeated event records
// nothing new and retries the send only if the order is paid but still unsent.
//
// Answer 2xx only once what should be saved is saved: a 5xx makes PayMongo deliver it again.
// Logs carry the outcome only, never the body.

export const maxDuration = 30; // room for the two OMS calls (10 s each) inside after()

const respond = (outcome: string, status = 200) => {
  console.info(JSON.stringify({ event: "paymongo_webhook", outcome }));
  return NextResponse.json(status === 200 ? { received: true } : { error: outcome }, { status });
};

const permanentFailure = (outcome: string) => {
  console.error(JSON.stringify({ event: "paymongo_webhook", outcome }));
  return NextResponse.json({ received: true });
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  // Fail closed: without the secret nothing can be verified. PayMongo delivers it again later.
  if (!webhookSecret) return respond("not_configured", 503);

  // The RAW text: parsing and re-serializing changes the bytes and the signature would not match.
  const rawBody = await req.text();
  const signed = verifySignature(rawBody, req.headers.get("paymongo-signature"), {
    webhookSecret,
    secretKey: process.env.PAYMONGO_SECRET_KEY,
  });
  if (!signed) return respond("invalid_signature", 401);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return respond("bad_json", 400);
  }

  const sessionId = paidEventSessionId(body);
  // Another event type we're subscribed to (or a test ping): nothing to do, don't make it retry.
  if (sessionId === null) return respond("ignored");
  if (typeof sessionId !== "string") return respond("bad_paid_event", 400);

  // The event carries no payment record (PayMongo attaches it after sending), so read the payment
  // from the session as PayMongo holds it now. Not attached yet, or PayMongo unreachable: 503 so
  // PayMongo delivers the event again. A 4xx for the session (another account or mode) or a
  // different session coming back can't be fixed by a retry: log an error and answer 200 (AC-6b).
  const fetched = await getCheckoutSession(sessionId, { secretKey: process.env.PAYMONGO_SECRET_KEY });
  if (!fetched.ok) return fetched.permanent ? permanentFailure("session_not_found") : respond("session_fetch_failed", 503);
  if ((fetched.value as { id?: unknown } | null)?.id !== sessionId) return permanentFailure("session_mismatch");
  const event = parsePaidSession(fetched.value);
  if ("bad" in event) {
    console.warn(JSON.stringify({ event: "paymongo_webhook", outcome: "payment_not_ready", missing: event.bad }));
    return NextResponse.json({ error: "payment_not_ready" }, { status: 503 });
  }

  try {
    const result = await markPaid(event);
    if (result.outcome === "unknown_session") return respond("unknown_session");
    after(async () => {
      try {
        await settlePaid(result);
      } catch (error) {
        // The order stays "paid, not sent"; a repeated event or the admin Send to OMS retries it.
        console.error(JSON.stringify({ event: "paymongo_webhook", orderNumber: result.orderNumber, outcome: "settle_failed", code: (error as { code?: string })?.code ?? null }));
      }
    });
    return respond(result.outcome);
  } catch (error) {
    console.error(JSON.stringify({ event: "paymongo_webhook", outcome: "db_error", code: (error as { code?: string })?.code ?? null }));
    return respond("db_error", 500);
  }
}
