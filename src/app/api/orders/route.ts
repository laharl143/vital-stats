import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";
import { paginate } from "@/lib/paginate";
import { orderTotal, parseNewOrder, toPrice } from "@/lib/new-order";

// GET /api/orders  (admin only)
// Query params: ?status=PENDING&page=1&limit=20
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const where = { ...(status && { status }) };

    const { data: orders, meta } = await paginate(searchParams, (skip, take) => ({
      findMany: prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      count: prisma.order.count({ where }),
    }));

    return NextResponse.json({ data: orders, meta });
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
    // Trimming, quantity, duplicate and required-field rules live in new-order.ts (shared with the form).
    const parsed = parseNewOrder(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { customerName, customerContact, customerAddress, notes, items } = parsed.value;

    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    const productById = new Map(products.map((p) => [p.id, p]));

    const orderItems = [];
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: "One of the products in this order no longer exists. Pick it again from the list." }, { status: 400 });
      }
      if (!product.isActive) {
        return NextResponse.json({ error: `${product.name} is inactive, so it can't be ordered.` }, { status: 400 });
      }
      // Always the product's own price; a client-sent unitPrice was already dropped by parseNewOrder.
      orderItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, unitPrice: toPrice(product.price) });
    }
    const { total } = orderTotal(orderItems.map((i) => ({ quantity: i.quantity, price: i.unitPrice })));

    const order = await prisma.order.create({
      data: {
        customerName,
        customerContact,
        customerAddress,
        notes,
        totalAmount: total || null,
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
