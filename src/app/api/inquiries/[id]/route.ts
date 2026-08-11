import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

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

    return NextResponse.json({ data: inquiry });
  } catch (error) {
    console.error("[GET /api/inquiries/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}
