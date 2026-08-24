import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

// GET /api/products/[slug]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // VS-164: hidden/inactive products must not be publicly readable by slug.
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        videos: { orderBy: { sortOrder: "asc" } },
        ingredients: true,
        benefits: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("[GET /api/products/[slug]]", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[slug]  (admin only — partial update)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { slug } = await params;
    const body = await req.json();

    const {
      name,
      tagline,
      description,
      howItWorks,
      howAdministered,
      warnings,
      category,
      deliveryMethod,
      price,
      currency,
      isBestSeller,
      isFdaApproved,
      isClinicallyGuided,
      requiresPrescription,
      isActive,
      sortOrder,
    } = body;

    const product = await prisma.product.update({
      where: { slug },
      data: {
        ...(name !== undefined && { name }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
        ...(howItWorks !== undefined && { howItWorks }),
        ...(howAdministered !== undefined && { howAdministered }),
        ...(warnings !== undefined && { warnings }),
        ...(category !== undefined && { category }),
        ...(deliveryMethod !== undefined && { deliveryMethod }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(currency !== undefined && { currency }),
        ...(isBestSeller !== undefined && { isBestSeller }),
        ...(isFdaApproved !== undefined && { isFdaApproved }),
        ...(isClinicallyGuided !== undefined && { isClinicallyGuided }),
        ...(requiresPrescription !== undefined && { requiresPrescription }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        videos: { orderBy: { sortOrder: "asc" } },
        ingredients: true,
        benefits: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ data: product });
  } catch (error: unknown) {
    console.error("[PUT /api/products/[slug]]", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
