import { NextRequest, NextResponse } from "next/server";
import { parseCartLines } from "@/lib/cart";
import { loadQuote } from "@/lib/load-quote";

// POST /api/cart/quote (VS-253, spec 0002). Public and read only: turns cart lines into names,
// OMS prices, quantity limits and a status per line. Stores nothing; only slugs are ever logged.
// ponytail: no rate limit, it only reads and the OMS call is cached 30s; add a per IP limit with
// shared storage if it is ever abused (spec 0002 follow up).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const parsed = parseCartLines(body?.items);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { quote } = await loadQuote(parsed.items, "POST /api/cart/quote");
    return NextResponse.json({ data: quote });
  } catch (error) {
    console.error("[POST /api/cart/quote]", error);
    return NextResponse.json({ error: "Failed to load the cart" }, { status: 500 });
  }
}
