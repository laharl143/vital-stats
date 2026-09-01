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

// PATCH /api/inquiries/[id]  (admin — update internal notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await req.json();
    const { adminNotes } = body;

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: {
        ...(adminNotes !== undefined && { adminNotes }),
      },
    });

    const product = inquiry.productId
      ? await prisma.product.findUnique({ where: { id: inquiry.productId }, select: { id: true, name: true } })
      : null;

    return NextResponse.json({ data: attachProductNames([inquiry], product ? [product] : [])[0] });
  } catch (error: unknown) {
    console.error("[PATCH /api/inquiries/[id]]", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}
