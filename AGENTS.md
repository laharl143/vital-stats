<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Rules

- OMS stock and prices: read them through `getAvailability` in `src/lib/oms.ts` (a strict 30 second in memory cache that never keeps a failure), and pass `fresh: true` for any check that decides an order, as `/api/checkout` does. Never use Next's `fetch` `revalidate` for stock or prices: it serves stale answers and keeps them while the OMS is down (spec 0003).
- Online payment (PayMongo): an order becomes paid only through `markPaid` in `src/lib/paid-order.ts`, fed a payment read from PayMongo's API for the order's stored session (`getCheckoutSession` + `parsePaidSession` in `src/lib/paymongo.ts`), from the signed webhook or `checkThenExpire`. Never mark an order paid from anything the browser sends or from the webhook body itself. Expire an unpaid order only through `checkThenExpire`, which asks PayMongo first. Convert money only with `toCentavos` / `formatCentavos`, and build the OMS payment record only from stored columns so every retry is byte identical (spec 0004).

## Agent skills

- MCP servers: PayMongo official (`https://mcp.paymongo.com/mcp`, recommended, not connected; docs: developers.paymongo.com/docs/accessing-our-mcp-server). Read and write access to payments and refunds, so connect it with test keys only.
