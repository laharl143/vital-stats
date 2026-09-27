<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Rules

- OMS stock and prices: read them through `getAvailability` in `src/lib/oms.ts` (a strict 30 second in memory cache that never keeps a failure), and pass `fresh: true` for any check that decides an order, as `/api/checkout` does. Never use Next's `fetch` `revalidate` for stock or prices: it serves stale answers and keeps them while the OMS is down (spec 0003).
