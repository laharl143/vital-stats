import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expirePayments, paymentState } from "@/lib/paid-order";

// GET /api/checkout/status?key=<checkoutKey>  (public; VS-255, spec 0004, AC-16)
//
// What /checkout/done polls after PayMongo sends the customer back. The key is the random
// checkoutKey only this browser holds, and the answer carries no name, phone, email or address.
// Nothing the browser sends can mark an order paid. Once its window is up, reading it asks PayMongo
// about the session (AC-13b), and only PayMongo's own answer can rescue it as paid.

export const maxDuration = 30; // room for the PayMongo check before expiry (AC-13b)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")?.toLowerCase() ?? "";
  if (!UUID.test(key)) return NextResponse.json({ error: "Missing or invalid key." }, { status: 400 });

  try {
    await expirePayments({ checkoutKey: key }); // lazy expiry of this one order (AC-13, AC-13b)
    const order = await prisma.order.findUnique({
      where: { checkoutKey: key },
      select: { orderNumber: true, totalAmount: true, paymentStatus: true, statusToken: true },
    });
    const state = order && paymentState(order.paymentStatus);
    if (!order || !state) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({
      data: {
        orderNumber: order.orderNumber, total: order.totalAmount?.toFixed(2) ?? "0.00", state,
        // The order status page link once the payment is settled (spec 0005, AC-3).
        ...(state !== "awaiting_payment" && state !== "expired" && order.statusToken && { statusToken: order.statusToken }),
      },
    });
  } catch (error) {
    console.error("[GET /api/checkout/status]", (error as { code?: string })?.code ?? "unknown");
    return NextResponse.json({ error: "Couldn't check your payment. Please try again." }, { status: 500 });
  }
}
