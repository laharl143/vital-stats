import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { sendOrderToOms } from "@/lib/oms";

// POST /api/orders/[id]/confirm  (admin — hand the order to the OMS, then mark it CONFIRMED)
// Body: { paymentMethod?: "cod" | "prepaid" }  (default "cod")
//
// The order stays PENDING unless BOTH OMS calls succeed; the OMS ids and CONFIRMED are saved
// together afterwards. Retrying after any failure replays identical calls (see lib/oms.ts).
// Logs only the order number and outcome: never the API key or any request/response body.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const paymentMethod = body?.paymentMethod ?? "cod";
    if (paymentMethod !== "cod" && paymentMethod !== "prepaid") {
      return NextResponse.json({ error: "Payment method must be cod or prepaid" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { select: { quantity: true, product: { select: { slug: true, requiresPrescription: true } } } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending orders can be confirmed" }, { status: 409 });
    }

    const result = await sendOrderToOms(order, {
      baseUrl: process.env.OMS_BASE_URL,
      apiKey: process.env.OMS_API_KEY,
      paymentMethod,
    });
    if (!result.ok) {
      console.info(JSON.stringify({ event: "oms_send", orderNumber: order.orderNumber, outcome: "failed" }));
      return NextResponse.json({ error: result.message }, { status: 422 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        omsCustomerId: result.customerId,
        omsOrderId: result.orderId,
        sentToOmsAt: new Date(),
        status: "CONFIRMED",
      },
      include: { items: true },
    });
    console.info(JSON.stringify({ event: "oms_send", orderNumber: order.orderNumber, outcome: "sent" }));

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[POST /api/orders/[id]/confirm]", error);
    return NextResponse.json({ error: "Failed to confirm order" }, { status: 500 });
  }
}
