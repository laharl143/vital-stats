import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MedicalHistoryStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";

// GET /api/medical-history  (admin only)
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as MedicalHistoryStatus | null;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [records, total] = await prisma.$transaction([
      prisma.medicalHistory.findMany({
        where: { ...(status && { status }) },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { doctorNotes: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.medicalHistory.count({ where: { ...(status && { status }) } }),
    ]);

    return NextResponse.json({
      data: records,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/medical-history]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch records" }, { status: 500 });
  }
}

// DELETE /api/medical-history?id=xxx  (admin only)
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.medicalHistory.delete({ where: { id } });

    return NextResponse.json({ message: "Record deleted" });
  } catch (error) {
    console.error("[DELETE /api/medical-history]", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

// PATCH /api/medical-history  (admin — bulk status update)
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || !status) {
      return NextResponse.json(
        { error: "ids (array) and status are required" },
        { status: 400 }
      );
    }

    await prisma.medicalHistory.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return NextResponse.json({ message: `${ids.length} records updated` });
  } catch (error) {
    console.error("[PATCH /api/medical-history]", error);
    return NextResponse.json({ error: "Failed to update records" }, { status: 500 });
  }
}