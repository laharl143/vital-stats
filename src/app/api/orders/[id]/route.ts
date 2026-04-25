import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

// GET /api/products
// Query params: ?category=SKIN_CARE&active=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as Category | null;
    const activeOnly = searchParams.get("active") !== "false";

    const products = await prisma.product.findMany({
      where: {
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        benefits: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products  (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      slug,
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
      sortOrder,
      benefits,
      ingredients,
    } = body;

    // Basic validation
    if (!slug || !name || !category || !deliveryMethod) {
      return NextResponse.json(
        { error: "slug, name, category, and deliveryMethod are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        slug,
        name,
        tagline,
        description,
        howItWorks,
        howAdministered,
        warnings,
        category,
        deliveryMethod,
        price: price ? parseFloat(price) : null,
        currency: currency ?? "PHP",
        isBestSeller: isBestSeller ?? false,
        isFdaApproved: isFdaApproved ?? false,
        isClinicallyGuided: isClinicallyGuided ?? false,
        requiresPrescription: requiresPrescription ?? false,
        sortOrder: sortOrder ?? 0,
        benefits: benefits
          ? {
              create: benefits.map(
                (b: { benefit: string; sortOrder?: number }, i: number) => ({
                  benefit: b.benefit,
                  sortOrder: b.sortOrder ?? i,
                })
              ),
            }
          : undefined,
        ingredients: ingredients
          ? {
              create: ingredients.map(
                (ing: { name: string; role?: string }) => ({
                  name: ing.name,
                  role: ing.role,
                })
              ),
            }
          : undefined,
      },
      include: {
        benefits: true,
        ingredients: true,
        images: true,
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/products]", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
