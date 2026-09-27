import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkThenExpire, paymentState } from "@/lib/paid-order";

// POST /api/checkout/cancel  { key }  (public; VS-255, spec 0004, AC-15)
//
// Called when the customer comes back through PayMongo's cancel link. Runs the check before expiry
// at once (AC-13b): the order expires only when PayMongo shows no payment for it. A paid session is
// rescued, an unanswerable one waits, and a replay (or a cancel after paying) changes nothing.

export const maxDuration = 30; // room for the PayMongo check

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.toLowerCase() : "";
  if (!UUID.test(key)) return NextResponse.json({ error: "Missing or invalid key." }, { status: 400 });

  try {
    const order = await prisma.order.findUnique({
      where: { checkoutKey: key },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, paymongoCheckoutId: true, paymentExpiresAt: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "AWAITING_PAYMENT" && order.paymentStatus === "UNPAID") await checkThenExpire(order, "cancelled");
    const now = await prisma.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true } });
    return NextResponse.json({ data: { state: paymentState(now?.paymentStatus ?? null) } });
  } catch (error) {
    console.error("[POST /api/checkout/cancel]", (error as { code?: string })?.code ?? "unknown");
    return NextResponse.json({ error: "Couldn't cancel. Please try again." }, { status: 500 });
  }
}
