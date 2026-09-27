# 0002. Guest cart in the browser, priced and stock checked by the OMS

**Date**: 2026-09-27
**Status**: Accepted

## Summary

Customers can add priced products to a cart from the product page, change quantities, remove items and see a subtotal on a new `/cart` page, with a cart icon and item count in the navbar. The cart lives in the browser (localStorage, the browser's own small storage) as just product slugs and quantities, so it needs no database table and holds no personal data. Every time the cart or a product page is shown, one storefront endpoint looks up names, OMS prices and OMS stock fresh, so out of stock or unsellable products can't be added and stale lines fix themselves. Checkout (7.3) is not built yet, so the cart goes live with a disabled "Checkout opens soon" button.

## Requirements

**User stories**:
- As a guest shopper, I want to add products to a cart and change or remove them, so I can buy several things in one order.
- As a guest shopper, I want my cart to still be there after a reload or in another tab, so I don't lose it.
- As a guest shopper, I want to know right away when something is out of stock or needs a prescription, so checkout holds no surprises.
- As the VitalStats owner, I want the cart to show the same price checkout will charge (the OMS price), so paid orders are not refused for a price mismatch.
- As the builder of checkout (7.3), I want a cart I can read and clear, plus a quote endpoint that already revalidates lines, so checkout only adds its final check.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: On `/products/[slug]`, a product that has a storefront price and is sellable in the OMS shows a quantity picker (1 to that product's `maxQty`) and an Add to cart button in place of today's "Order Now" link. Adding keeps the customer on the page, the button briefly reads "Added", a "View cart" link appears, the navbar count goes up, and a polite live region announces "Added to cart".
- **AC-2**: Adding a product already in the cart increases that line's quantity; a line's quantity never goes above `maxQty`, which is the lower of the OMS available stock and 10. When the line is already at `maxQty`, the button is disabled and reads "Maximum in your cart".
- **AC-3**: A product with no storefront price keeps today's "Inquire Now" link to `/contact` and has no Add to cart. Product cards on `/products` and the home page are unchanged (they still link to the product page).
- **AC-4**: When the OMS reports stock 0, the product page shows "Out of stock" and Add to cart is disabled. When the OMS does not list the product (unknown SKU, inactive, not stock tracked) or lists it with no price, the product page shows "Not available online" with the Inquire link and no Add to cart, and the server logs the slug.
- **AC-5**: The cart is stored in localStorage under `vs-cart` as `{ "v": 1, "items": [{ "slug", "qty" }] }` only (no names, prices or personal data). It survives a reload and a new tab, and a change made in one open tab shows in the other open tabs without a reload.
- **AC-6**: The public Navbar shows a cart icon on every public page, linking to `/cart`, with a badge of the total quantity (sum of `qty` over all lines); with an empty cart the icon shows no badge. Its accessible name is "Cart, N items". The server render shows no badge (no hydration mismatch).
- **AC-7**: `/cart` lists each line with its primary image, name linking to the product page, a "Needs a prescription" badge when the product requires one, the unit price, a quantity stepper limited to 1 to `maxQty`, the line total and a Remove button, then a subtotal and the note "Delivery fee is calculated at checkout".
- **AC-8**: Unit prices and the subtotal in the cart use the OMS price from the availability endpoint. When the storefront price differs from the OMS price, the server logs a warning naming the slug only.
- **AC-9**: When the cart loads or changes, a line whose quantity is above its current `maxQty` is lowered to `maxQty`, the lowered quantity is saved, and the line says "Only N available, we updated your quantity". A line that is out of stock or no longer sellable stays visible, greyed out with a Remove button and the reason "Out of stock" (`out_of_stock`) or "No longer available online" (`unavailable`, one wording for every cause), shows no price, and is left out of the subtotal.
- **AC-10**: When the OMS is unreachable or not configured, Add to cart still works with `maxQty` 10 and the notice "We couldn't check stock right now, it will be confirmed at checkout". The cart then shows storefront prices marked "Estimated" and labels the total "Estimated subtotal".
- **AC-11**: `/cart` renders a loading state while the quote loads, an empty state ("Your cart is empty" with a link to `/products`) when there are no lines, and an error state ("We couldn't load your cart" with a Retry button) when the quote request itself fails; the saved cart is never cleared by an error.
- **AC-12**: When the cart holds at least one prescription product, `/cart` shows one note: "Checkout will ask for your prescription or a consult booking. A pharmacist reviews it before your order ships."
- **AC-13**: The cart shows a visible but disabled "Checkout opens soon" button (with `aria-disabled` and the reason as text), until checkout (7.3) replaces it.
- **AC-14**: `POST /api/cart/quote` rejects a malformed body (`items` not an array, more than 20 entries before duplicates are merged, a slug that is not a string of 1 to 100 characters, a quantity that is not a whole number from 1 to 10) with 400 and `{ error }`. Any other slug is simply looked up and comes back `unavailable` if nothing matches. It returns only public catalog fields and `maxQty`, never the raw OMS stock number, and stores nothing.
- **AC-15**: The storefront server caches the OMS availability answer for at most 30 seconds, so product and cart views within that window make no extra OMS calls.
- **AC-16**: Missing, corrupt or unknown version data under `vs-cart` is treated as an empty cart without an error, and is replaced on the next change.

## Decision

**Chosen option**: Option 1: Browser cart of slugs and quantities, with a server quote endpoint over the OMS

The cart is a localStorage list of `{ slug, qty }`, read through one small `useCart` hook, and every view asks `POST /api/cart/quote` for fresh names, OMS prices, stock limits and line status.

Picks made in the design conversation (the owner took the recommended option on most, override any of them):
- **Where to add**: the product detail page only. Runner up: also quick add on product cards (skips the medical warnings).
- **Products with no price**: not addable, keep Inquire. Runner up: addable, priced at checkout (the OMS refuses `price_unknown`).
- **Prescription products**: addable and clearly marked. Runner up: block checkout until 7.12.
- **Quantity cap**: the lower of OMS stock and 10 per line. Runner up: stock only.
- **Storage**: browser localStorage. Runner up: a database cart keyed by a cookie.
- **Saved data**: slug and quantity only. Runner up: also a price snapshot.
- **Cart UI**: a `/cart` page plus a navbar icon. Runner up: a slide over drawer.
- **After add**: stay on the page with an inline confirmation. Runner up: go to `/cart`.
- **Price source**: the OMS price, with mismatches logged. Runner up: the storefront price.
- **Stock check**: on the product page and the cart page (checkout checks again). Runner up: only on add.
- **OMS down**: allow add with a notice. Runner up: block add.
- **Caching**: a short server cache of 30 seconds (the owner's pick over no cache). Runner up: no cache.
- **OMS down price**: the storefront price, marked estimate. Runner up: no price.
- **Not in OMS**: not addable, "Not available online". Runner up: addable.
- **Stale lines**: adjust automatically with a notice. Runner up: flag only.
- **Checkout button until 7.3**: live now, disabled "Checkout opens soon" (the owner's pick over hiding the cart behind a flag). Runner up: hide the cart until 7.3.

Calls made by the architect (RECOMMEND items):
- **Cross tab sync**: a `useSyncExternalStore` hook that listens to the browser `storage` event. Runner up: a React context provider (needs a provider in `layout.tsx` and still misses other tabs).
- **Quote endpoint method**: `POST` with a JSON body. Runner up: `GET` with the lines in the query string (awkward to validate, and the endpoint is not meant to be cached per cart anyway, the OMS call is).
- **OMS availability fetch**: one call for the whole catalog (`limit=500`) cached for 30 seconds, not one call per slug. Runner up: `?sku=` per line (one OMS call per line, more rate limit use).
- **Exposing stock**: return `maxQty` (already capped at 10), never the raw `available` number. Runner up: return `available` (leaks inventory levels to anyone).
- **Money math**: add prices as whole centavos (integers), format with 2 places. Runner up: `parseFloat` sums (floating point drift on totals).
- **Rate limiting the quote endpoint**: none for now, with a `ponytail:` note. It only reads, the OMS call is cached, and it matches the existing public `GET /api/products`. Runner up: a per IP limiter, which needs shared storage this app does not have (the existing limit counts saved rows).
- **Line limit**: 20 distinct lines. Runner up: no limit (an unbounded body on a public endpoint).

## Feature design

**Data model sketch**: no database change and no migration. The only stored shape is in the browser:

| Where | Key | Shape | Rules |
|---|---|---|---|
| localStorage | `vs-cart` | `{ "v": 1, "items": [{ "slug": string, "qty": number }] }` | `slug` unique per list; `qty` a whole number from 1 to 10; at most 20 items; anything else parses as empty |

Server reads, per request: storefront `Product` (`slug`, `name`, `price`, `currency`, `isActive`, `requiresPrescription`, primary `ProductImage.url`) and the OMS availability list (`sku`, `available`, `price`, `currency`). The storefront `Product.slug` is the OMS `sku`, as `src/lib/oms.ts` already assumes.

**State transitions**: none stored. Each line gets a computed status on every quote:
- `ok`: sellable, `qty` within `maxQty`
- `adjusted`: sellable, `qty` was above `maxQty` and was lowered
- `out_of_stock`: the OMS lists it with `available` 0
- `unavailable`: no such active storefront product, no storefront price, not listed by the OMS, no OMS price, or a currency other than PHP
- `unchecked`: the OMS could not be reached; storefront price used as an estimate, `maxQty` 10

**Shared code**:
- `src/lib/cart.ts` (pure, no React): `CART_KEY = "vs-cart"`, `MAX_QTY_PER_LINE = 10`, `MAX_LINES = 20`, `parseCart(raw: string | null): CartItem[]`, `addItem(items, slug, qty, maxQty)`, `setQty(items, slug, qty)`, `removeItem(items, slug)`, `clearCart()` (for 7.3). `parseCart` returns `[]` for null, bad JSON, `v` other than 1, or any bad item.
- `src/lib/useCart.ts` (client): `useCart()` returns `{ items, count, add, setQty, remove }`, built on `useSyncExternalStore`. It subscribes to the `storage` event for other tabs and to an in module listener set for the same tab. It caches the parsed snapshot by raw string, so the snapshot reference is stable (a new array on every read would loop). `getServerSnapshot` returns a shared empty array. Every localStorage access is wrapped in try/catch (private mode can throw).
- `getAvailability(opts)` in `src/lib/oms.ts`: `GET ${OMS_BASE_URL}/products/availability?limit=500` with the bearer key, `cache: "no-store"` and a 5 second timeout. It keeps the last good answer in memory and serves it only while it is under 30 seconds old (per server instance); a failed call is never kept, so an outage shows as `ok: false` straight away. A `fresh: true` option skips that copy, for checks that decide an order (checkout at submit, spec 0003). It never uses Next's `fetch` `revalidate`, which serves the old answer while refreshing in the background and keeps it when the refresh fails (updated 2026-09-27, VS-254 fix, VS-267). It returns `{ ok: true, bySku: Map<string, { available: number; price: string | null; currency: string }> } | { ok: false, reason }`, in the same style as `getOmsOrder`. If `X-Total-Count` is above 500 it logs a warning (`ponytail:` one page of 500, page through when the catalog grows past it).
- `src/lib/cart-quote.ts` (pure): `buildQuote(requested, products, availability)` applies the status rules above and the centavo math, and returns the response body. It takes plain data, so it is unit tested without a database or network. It also exports `toCentavos(price: string): number | null`, which splits on the dot, pads or cuts the fraction to exactly 2 digits (`"1299.9"` → 129990, `"10"` → 1000), and returns null for anything that is not a plain non negative decimal. It never uses `parseFloat` for money. A price that fails `toCentavos` makes the line `unavailable`. OMS `available` is clamped to at least 0 before `maxQty` is computed.
- Price mismatch check: compare `toCentavos(storefront price)` with `toCentavos(OMS price)` as integers, never as strings, so `"10"` and `"10.00"` are equal.
- Write back of adjusted quantities (cart page): after a quote returns, for each `adjusted` line, call `setQty` only if the stored `qty` for that slug still equals the `qty` that quote was sent with (the customer has not changed it since) and differs from `maxQty`. `setQty` does nothing when the value is unchanged, so the write back triggers at most one follow up quote, which then returns `ok`, and never loops. Across tabs the last write wins (the `storage` event refreshes the other tab, which quotes again); no version stamp is needed.
- Latest request wins on both the product page and the cart page: each new quote aborts the one before it (`AbortController`), so a slow older reply never overwrites a newer one.
- `src/app/api/cart/quote/route.ts`: validates, merges duplicate slugs (sum, capped at 10), reads the products in one `findMany`, calls `getAvailability`, logs mismatches and unsellable slugs, returns `buildQuote`'s result.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/cart/quote` | POST | `items: { slug: string, qty: number }[]` (req, 1 to 20) | `{ data: { lines: [{ slug, name, imageUrl, requiresPrescription, unitPrice, currency, qty, maxQty, status, estimate }], subtotal, currency, estimate, omsChecked } }` | public | 400 `{ error }` malformed body; 500 `{ error }` storefront database failure (logged as `[POST /api/cart/quote]`) |
| `/cart` | GET (page) | none | server page with `metadata` title "Your cart" and `robots: { index: false }`, rendering the client cart view | public | none |

An empty `items` array is valid and returns no lines (the page shows the empty state without calling the endpoint anyway). A slug with no matching product returns a line with status `unavailable` and `name` null, so the customer can still remove it.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Quote | `name`, `imageUrl`, `requiresPrescription` | storefront `Product` row by `slug` (primary `ProductImage.url`, else null) |
| Quote | `unitPrice`, `currency` (OMS reachable) | OMS availability `price`, `currency` for that `sku` |
| Quote | `unitPrice`, `currency` (OMS down) | storefront `Product.price`, `Product.currency`, with `estimate: true` |
| Quote | `unitPrice` (`out_of_stock`, `unavailable`) | `null`, and no line total |
| Quote | `maxQty` | `min(max(OMS available, 0), 10)`; 10 when the OMS is down; 0 for `out_of_stock` and `unavailable` |
| Quote | `qty` returned | requested `qty`, lowered to `maxQty` when above it |
| Quote | `status` | the rules under State transitions |
| Quote | `subtotal` | sum of `qty * unitPrice` over lines with status `ok`, `adjusted` or `unchecked`, in whole centavos, formatted with 2 places |
| Quote | `estimate` (total) | true when any counted line is `unchecked` |
| Quote | `omsChecked` | `getAvailability` result `ok` |
| Product page | the add controls shown | a quote for `[{ slug, qty: 1 }]` on page load, plus the existing `product.price` null check for Inquire |
| Product page | quantity already in cart | `useCart().items` |
| Navbar | badge count | `useCart().count`, the sum of `qty` |
| Cart page | "Only N available" note | line `status === "adjusted"` and its `maxQty` |
| Cart page | price display | the existing `formatPrice` in `src/lib/product-labels.ts` |
| Server log | mismatch and unsellable warnings | slug and the two prices only, never request bodies or IPs |

**Key invariants**:
- The browser never stores a name, price or stock number; the server recomputes all of them on every quote.
- A line's quantity is always a whole number from 1 to 10 in storage and never above `maxQty` after a quote.
- The subtotal never includes an `out_of_stock` or `unavailable` line.
- The raw OMS `available` number never leaves the storefront server.
- The OMS API key is only used server side (`src/lib/oms.ts`); the browser only ever calls `/api/cart/quote`.
- The cart is advisory. Checkout (7.3) checks availability again at submit, and the OMS allocation stays the final word (scope decision, no stock hold).

**Security model**: The cart and the quote endpoint are public, with no sign in. No personal data is collected or stored, so this feature adds nothing to the RA 10173 scope; the only request data is slugs and quantities. The quote endpoint returns only what product pages already show, plus a capped `maxQty`. The OMS key stays in server env vars. No audit log is needed, since nothing is written. No rate limit for now (see Decision); the cached OMS call means extra requests cost one small database read each.

**Configuration required**: none new. It reuses `OMS_BASE_URL` and `OMS_API_KEY`; without them the cart runs in the OMS down mode (AC-10).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: add a stocked, priced product twice from its page, open `/cart`, change the quantity, remove it, reload in between; the count, lines, OMS prices and subtotal stay right and the cart survives the reload. Verifies **AC-1**, **AC-2**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
- Unit: `buildQuote` for each status (`ok`, `adjusted`, `out_of_stock`, `unavailable` for each reason, `unchecked`), centavo sums like 3 × 1,299.90, and that `available` never appears in the output. Verifies **AC-4**, **AC-8**, **AC-9**, **AC-10**, **AC-14**
- Unit: `parseCart` returns `[]` for null, `"{"`, `{ "v": 2 }`, a negative or fractional qty, and 21 items; `addItem` caps at `maxQty`. Verifies **AC-2**, **AC-16**
- Unit: `getAvailability` with an injected `fetchFn` for a normal reply, a 401, a timeout and a missing config. Verifies **AC-10**, **AC-15**
- Failure case: with `OMS_BASE_URL` unset, the product page still adds with the notice and the cart shows "Estimated subtotal". Verifies **AC-10**
- Failure case: an OMS product at stock 0 shows "Out of stock"; a storefront product missing from the OMS shows "Not available online" and its slug is logged. Verifies **AC-4**
- Stale line: put qty 10 in localStorage for a product with 3 in stock; `/cart` shows 3 with the note and saves 3. Verifies **AC-9**
- Validation: POST a body with 21 entries, qty 0, qty 1.5, a numeric slug and a 101 character slug; each gets 400. A slug like `"../x"` gets 200 with an `unavailable` line. Verifies **AC-14**
- Unit: `toCentavos` for `"1299.9"`, `"1299.90"`, `"10"`, `"0.005"` (cut to 0), `"-1"`, `"abc"`; a storefront `"10"` against an OMS `"10.00"` logs no mismatch. Verifies **AC-8**
- Race: change a quantity while a stale quote is in flight; the customer's value is kept, not the older adjustment. Verifies **AC-9**
- States: empty cart, quote endpoint returning 500 (Retry works, storage kept), a prescription product showing the badge and note, the disabled checkout button. Verifies **AC-11**, **AC-12**, **AC-13**
- Two tabs: a change in one tab updates the count in the other. Verifies **AC-5**, **AC-6**
- Auth/permission: none needed (public). A browser request never reaches the OMS directly and the OMS key is absent from client bundles (search the built client JS for `OMS_API_KEY`'s value). Verifies **AC-14**

## Build plan

The build approach is Journey, and this is the second stop on Journey 1 (7.1 consent, then cart, then checkout). The feature is built as one end to end slice through the endpoint, then the three screens, so each screen can be tried against real OMS data as soon as it lands. No migration.

1. [x] `src/lib/cart.ts` and `src/lib/cart.test.ts` (node:test), added to the `test` script in `package.json`. Satisfies **AC-2**, **AC-5**, **AC-16**
2. [x] `getAvailability` in `src/lib/oms.ts`, with tests in `src/lib/oms.test.ts`. Satisfies **AC-10**, **AC-15**
3. [x] `src/lib/cart-quote.ts` (`buildQuote`) and `src/lib/cart-quote.test.ts`, added to the `test` script. Satisfies **AC-4**, **AC-8**, **AC-9**, **AC-10**, **AC-14**
4. [x] `POST /api/cart/quote` route: validation, merge duplicates, one `findMany`, `getAvailability`, the mismatch and unsellable logs. Check in a production build (`npm run build && npm run start`) that the OMS call is reused for at most 30 seconds. (Built first with `revalidate: 30`; replaced by the in memory cache in the VS-254 fix, see the `getAvailability` note above.) Satisfies **AC-4**, **AC-8**, **AC-14**, **AC-15**
5. [x] `src/lib/useCart.ts` hook. Satisfies **AC-5**, **AC-16**
6. [x] Navbar cart icon and badge (lucide `ShoppingBag`, already installed), hidden in search mode like the other icons. Satisfies **AC-6**
7. [x] Product page: replace the "Order Now" link with the quote driven add controls (loading, add, added, maximum, out of stock, not available online, OMS down notice); leave the no price Inquire path as it is. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-10**
8. [x] `/cart` page: server `page.tsx` with metadata and noindex, client cart view with lines, stepper, remove, the guarded write back of adjusted quantities, subtotal, notes, states and the disabled checkout button, with latest request wins. Satisfies **AC-7**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**

After `/develop`, the Beta workflow runs `/check verify`, then `/test`.

## Consequences

**Positive**:
- No migration on the shared production database, and no personal data, so nothing to clean up or disclose.
- The cart shows the price checkout will charge, so paid orders refused for `amount_mismatch` become rare.
- Checkout (7.3) gets `useCart`, `clearCart` and a quote endpoint that already validates lines; it only adds its final check at submit.
- A short OMS outage does not stop people browsing and building a cart.

**Negative / tradeoffs**:
- The cart is per browser. A customer who switches devices starts over, and accounts (7.13) will have to decide whether to store carts on the server then.
- Customers can build a cart but can't finish an order until 7.3 ships. The disabled button is honest, but some will leave and not come back. Hiding the cart until 7.3 was the alternative.
- The product page still shows the storefront price while the cart shows the OMS price. If the two differ, customers see two numbers until an admin fixes the catalog (the log names the slug).
- With the 30 second cache, a product that just sold out can look addable for up to 30 seconds. The cart fixes it on the next quote, and checkout catches it at submit.
- The quote endpoint has no rate limit. Heavy scripted use costs database reads, not OMS calls.
- No abandoned cart data exists anywhere, so 7.7 analytics can only count add to cart events, not reconstruct carts.
- A catalog above 500 stock tracked products would silently miss products until paging is added (a warning is logged).

**Neutral**:
- The home page and product cards keep their "Order Now" links to the product page.
- A new public route `/cart` and a new public endpoint `/api/cart/quote`.

## Follow-up

- [ ] 7.3 Checkout (VS-254): replace the disabled button with the real checkout link, reuse `POST /api/cart/quote` for the final check at submit, and call `clearCart()` once the order is saved.
- [ ] 7.7 Analytics (VS-257): send the add to cart event from `useCart().add`, with slug and quantity only.
- [ ] 7.13 Customer accounts (VS-260): decide whether a signed in cart moves to the server and how a guest cart merges into it.
- [ ] Catalog hygiene: make the storefront and OMS prices match for every sellable product, starting with any slug the mismatch log names. A later change could show the OMS price on the product page too.
- [ ] If the quote endpoint is ever abused, add a per IP limit with shared storage (for example the existing database or an edge store).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
