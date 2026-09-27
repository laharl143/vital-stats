import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/lib/oms";
import { MAX_LINES, MAX_QTY_PER_LINE, isValidQty, type CartItem } from "@/lib/cart";
import { buildQuote } from "@/lib/cart-quote";

// POST /api/cart/quote (VS-253, spec 0002). Public and read only: turns cart lines into names,
// OMS prices, quantity limits and a status per line. Stores nothing; only slugs are ever logged.
// ponytail: no rate limit, it only reads and the OMS call is cached 30s; add a per IP limit with
// shared storage if it is ever abused (spec 0002 follow up).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const raw = body?.items;
  if (!Array.isArray(raw) || raw.length > MAX_LINES) {
    return NextResponse.json({ error: `items must be a list of at most ${MAX_LINES} lines.` }, { status: 400 });
  }

  // Validate, then merge duplicate slugs (summed, capped at 10), keeping first seen order.
  const merged = new Map<string, number>();
  for (const item of raw as { slug?: unknown; qty?: unknown }[]) {
    const { slug, qty } = item ?? {};
    if (typeof slug !== "string" || slug.length < 1 || slug.length > 100 || !isValidQty(qty)) {
      return NextResponse.json(
        { error: `Each line needs a slug (1 to 100 characters) and a whole quantity from 1 to ${MAX_QTY_PER_LINE}.` },
        { status: 400 },
      );
    }
    merged.set(slug, Math.min((merged.get(slug) ?? 0) + qty, MAX_QTY_PER_LINE));
  }
  const requested: CartItem[] = [...merged].map(([slug, qty]) => ({ slug, qty }));

  try {
    const [rows, availability] = await Promise.all([
      requested.length === 0
        ? []
        : prisma.product.findMany({
            where: { slug: { in: requested.map((i) => i.slug) } },
            select: {
              slug: true, name: true, price: true, currency: true, isActive: true, requiresPrescription: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          }),
      requested.length === 0
        ? ({ ok: false, reason: "not_configured" } as const)
        : getAvailability({ baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY }),
    ]);

    const products = rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price?.toString() ?? null,
      currency: p.currency,
      isActive: p.isActive,
      requiresPrescription: p.requiresPrescription,
      imageUrl: p.images[0]?.url ?? null,
    }));
    const { quote, mismatched, unsellable } = buildQuote(requested, products, availability);

    if (!availability.ok && requested.length > 0) console.warn(`[POST /api/cart/quote] OMS availability unavailable: ${availability.reason}`);
    for (const slug of mismatched) console.warn(`[POST /api/cart/quote] storefront and OMS prices differ for ${slug}`);
    for (const slug of unsellable) console.warn(`[POST /api/cart/quote] not sellable in the OMS (unlisted or no price): ${slug}`);

    return NextResponse.json({ data: quote });
  } catch (error) {
    console.error("[POST /api/cart/quote]", error);
    return NextResponse.json({ error: "Failed to load the cart" }, { status: 500 });
  }
}
