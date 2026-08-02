import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";

// GET /api/orders  (admin only)
// Query params: ?status=PENDING&page=1&limit=20
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { ...(status && { status }) },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: { ...(status && { status }) },
      }),
    ]);

    return NextResponse.json({
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders  (admin — create an order)
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { customerName, customerContact, customerAddress, notes, items } = body;

    if (!customerName || !customerContact || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "customerName, customerContact, and at least one item are required" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i: { productId: string }) => i.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItems = items.map((item: { productId: string; quantity?: number; unitPrice?: number }) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? (product.price ? parseFloat(product.price.toString()) : null);
      if (unitPrice !== null) totalAmount += unitPrice * quantity;

      return {
        productId: item.productId,
        productName: product.name,
        quantity,
        unitPrice,
      };
    });

    const order = await prisma.order.create({
      data: {
        customerName,
        customerContact,
        customerAddress: customerAddress ?? null,
        notes: notes ?? null,
        totalAmount: totalAmount || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
