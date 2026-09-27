import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/lib/oms";
import { buildQuote, type Quote } from "@/lib/cart-quote";
import type { CartItem } from "@/lib/cart";

// Server side quote for cart lines (spec 0002), shared by POST /api/cart/quote and POST /api/checkout
// (spec 0003). Reads the storefront products and the OMS availability (cached up to 30 seconds, or
// fresh for checkout's final check), then prices every line.
// Logs slugs and reason codes only. Throws on a database failure; callers answer 500.
export async function loadQuote(
  requested: CartItem[],
  logTag: string,
  opts: { fresh?: boolean } = {},
): Promise<{ quote: Quote; productIdBySlug: Map<string, string> }> {
  const [rows, availability] = await Promise.all([
    requested.length === 0
      ? []
      : prisma.product.findMany({
          where: { slug: { in: requested.map((i) => i.slug) } },
          select: {
            id: true, slug: true, name: true, price: true, currency: true, isActive: true, requiresPrescription: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        }),
    requested.length === 0
      ? ({ ok: false, reason: "not_configured" } as const)
      : getAvailability({ baseUrl: process.env.OMS_BASE_URL, apiKey: process.env.OMS_API_KEY, fresh: opts.fresh }),
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

  if (!availability.ok && requested.length > 0) console.warn(`[${logTag}] OMS availability unavailable: ${availability.reason}`);
  for (const slug of mismatched) console.warn(`[${logTag}] storefront and OMS prices differ for ${slug}`);
  for (const slug of unsellable) console.warn(`[${logTag}] not sellable in the OMS (unlisted or no price): ${slug}`);

  return { quote, productIdBySlug: new Map(rows.map((p) => [p.slug, p.id])) };
}
