import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { attachProductNames } from "@/lib/inquiries";

// GET /api/inquiries/[id]  (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const inquiry = await prisma.inquiry.findUnique({ where: { id } });

    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const product = inquiry.productId
      ? await prisma.product.findUnique({ where: { id: inquiry.productId }, select: { id: true, name: true } })
      : null;

    return NextResponse.json({ data: attachProductNames([inquiry], product ? [product] : [])[0] });
  } catch (error) {
    console.error("[GET /api/inquiries/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}
