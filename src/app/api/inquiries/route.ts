import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InquiryType, InquiryStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";
import { notifyAdmin } from "@/lib/notify-admin";
import { paginate } from "@/lib/paginate";
import { attachProductNames } from "@/lib/inquiries";

// GET /api/inquiries  (admin only)
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as InquiryStatus | null;
    const type = searchParams.get("type") as InquiryType | null;
    const where = {
      ...(status && { status }),
      ...(type && { type }),
    };

    const { data: inquiries, meta } = await paginate(searchParams, (skip, take) => ({
      findMany: prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      count: prisma.inquiry.count({ where }),
    }));

    const productIds = [...new Set(inquiries.map((i) => i.productId).filter((id): id is string => !!id))];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [];

    return NextResponse.json({ data: attachProductNames(inquiries, products), meta });
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

    try {
      await notifyAdmin({
        kind: "inquiry",
        name: inquiry.name,
        contactInfo: inquiry.contactInfo,
        message: inquiry.message,
      });
    } catch (err) {
      console.error("[notifyAdmin]", err);
    }

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