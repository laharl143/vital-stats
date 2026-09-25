import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { OMS_ADDRESS_LOCK_MESSAGE, OMS_LOCK_MESSAGE, isAddressChange, isLockedByOms } from "@/lib/order-lock";

// GET /api/orders/[id]  (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PATCH /api/orders/[id]  (admin — update status/notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, customerAddress, notes, adminNotes } = body;

    // A sent order's status belongs to the OMS (the webhook writes it, not this route), and the OMS
    // keeps the address it was given at Confirm. Refuse the WHOLE request before writing anything if
    // it changes either; notes-only changes (or the same address again) still go through. A missing
    // order falls through to the 404.
    let sent = false;
    if (status !== undefined || customerAddress !== undefined) {
      const existing = await prisma.order.findUnique({
        where: { id },
        select: { omsOrderId: true, customerAddress: true },
      });
      sent = !!existing && isLockedByOms(existing);
      if (sent && status !== undefined) {
        return NextResponse.json({ error: OMS_LOCK_MESSAGE }, { status: 409 });
      }
      if (sent && customerAddress !== undefined && isAddressChange(existing?.customerAddress, customerAddress)) {
        return NextResponse.json({ error: OMS_ADDRESS_LOCK_MESSAGE }, { status: 409 });
      }
    }

    // Confirming hands the order to the OMS, so it only happens via POST /api/orders/[id]/confirm.
    if (status === "CONFIRMED") {
      return NextResponse.json({ error: "Use the Confirm action to confirm an order" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        // On a sent order the same address again is a no-op: don't rewrite it (e.g. with stray spaces).
        ...(customerAddress !== undefined && !sent && { customerAddress }),
        ...(notes !== undefined && { notes }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
      include: { items: true },
    });

    return NextResponse.json({ data: order });
  } catch (error: unknown) {
    console.error("[PATCH /api/orders/[id]]", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
