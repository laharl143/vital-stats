import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InquiryType, InquiryStatus } from "@prisma/client";

// GET /api/inquiries  (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as InquiryStatus | null;
    const type = searchParams.get("type") as InquiryType | null;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [inquiries, total] = await prisma.$transaction([
      prisma.inquiry.findMany({
        where: {
          ...(status && { status }),
          ...(type && { type }),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inquiry.count({
        where: {
          ...(status && { status }),
          ...(type && { type }),
        },
      }),
    ]);

    return NextResponse.json({
      data: inquiries,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/inquiries]", error);
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

// POST /api/inquiries  (public — contact form submission)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contactInfo, message, type, productId } = body;

    if (!name || !contactInfo || !message) {
      return NextResponse.json(
        { error: "name, contactInfo, and message are required" },
        { status: 400 }
      );
    }

    if (name.length > 100 || contactInfo.length > 200 || message.length > 2000) {
      return NextResponse.json(
        { error: "Input exceeds maximum allowed length" },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.inquiry.count({
      where: { ipAddress, createdAt: { gte: oneHourAgo } },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name: name.trim(),
        contactInfo: contactInfo.trim(),
        message: message.trim(),
        type: type ?? InquiryType.GENERAL,
        productId: productId ?? null,
        ipAddress,
      },
    });

    return NextResponse.json(
      {
        data: { id: inquiry.id },
        message: "Inquiry submitted successfully. We will contact you shortly!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/inquiries]", error);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}

// PATCH /api/inquiries  (admin — bulk status update)
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

    await prisma.inquiry.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return NextResponse.json({ message: `${ids.length} inquiries updated` });
  } catch (error) {
    console.error("[PATCH /api/inquiries]", error);
    return NextResponse.json({ error: "Failed to update inquiries" }, { status: 500 });
  }
}