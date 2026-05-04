import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [records, total] = await prisma.$transaction([
      prisma.medicalHistory.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.medicalHistory.count(),
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