import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { refundOrder } from "@/lib/paid-order";
import { emailCustomer } from "@/lib/notify-customer";

// POST /api/orders/[id]/refund  (admin; VS-255, spec 0004, AC-12)
// Body: {} refunds the full paid amount through PayMongo's refund API.
//       { manual: true, note } records a refund done outside PayMongo (for a channel it can't
//       refund by API). Either way the order ends REFUNDED and CANCELLED.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = ((await req.json().catch(() => null)) ?? {}) as { manual?: unknown; note?: unknown };
    const result = await refundOrder(id, {
      manual: body.manual === true,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    after(() => emailCustomer(id, "REFUNDED")); // spec 0005, AC-9; never throws

    const updated = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[POST /api/orders/[id]/refund]", (error as { code?: string })?.code ?? "unknown");
    return NextResponse.json({ error: "Failed to refund order" }, { status: 500 });
  }
}
