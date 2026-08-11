import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

// GET /api/medical-history/[id]  (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const record = await prisma.medicalHistory.findUnique({
      where: { id },
      include: { doctorNotes: { orderBy: { createdAt: "desc" } } },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error("[GET /api/medical-history/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 });
  }
}
