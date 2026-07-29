import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MedicalHistoryStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const record = await prisma.medicalHistory.create({
      data: {
        fullName: data.fullName ?? "",
        dateOfBirth: `${data.dobMonth}/${data.dobDay}/${data.dobYear}`,
        gender: data.gender ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        height: data.height ?? "",
        weight: data.weight ?? "",
        mtc: data.mtc ?? "",
        pancreatitis: data.pancreatitis ?? "",
        gallbladder: data.gallbladder ?? "",
        gi: data.gi ?? "",
        diabetes: data.diabetes ?? "",
        pregnant: data.pregnant ?? "",
        surgeries: data.surgeries ?? "",
        medications: data.medications ?? "",
        allergies: data.allergies ?? "",
        consent1: data.consent1 ?? false,
        consent2: data.consent2 ?? false,
        consent3: data.consent3 ?? false,
        ipAddress,
      },
    });

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/medical-history]", error);
    return NextResponse.json({ success: false, error: "Failed to save medical history" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

// PATCH /api/medical-history  (admin — bulk status update)
export async function PATCH(req: NextRequest) {
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