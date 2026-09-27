# Verify: Cart · spec 0002 · updated 2026-09-27
_Steps derived from spec 0002 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Verified 2026-09-27 by `/check verify cart`: PASS. OMS 7.4 went live in production the same day, and the real buyable path (Luméla Soap, ₱150) was checked against it; stock limits, mismatch, out of stock and OMS down were checked on a production build against a local fake OMS. The one open step needs a product with a primary image (none has one today).

Original note: until the OMS 7.4 migration (availability `price` and `currency`) reaches the OMS the storefront points at, every product is `unavailable` in the cart. On 2026-09-27 the buyable path (the steps marked **needs OMS 7.4**) was checked in the in app browser against a stubbed `/api/cart/quote`; recheck them against the real OMS once 7.4 is live.

## UI / manual
- [x] **needs OMS 7.4** Open a stocked, priced product page (for example `/products/lumela-soap`) → a quantity picker and Add to cart show; pick 2, press Add → the button reads "Added ✓", the navbar badge goes up by 2, "View cart" appears, and a screen reader hears "Added to cart" → AC-1
- [x] **needs OMS 7.4** Keep adding until the line reaches the OMS stock (or 10) → the button becomes "Maximum in your cart" and the cart never holds more → AC-2
- [x] Open a product with no storefront price (for example `/products/nad-plus`) → only "Inquire Now", no Add to cart; product cards on `/products` and the home page still link to the product page → AC-3
- [x] Open a product the OMS does not list, or lists without a price → "Not available online" plus Inquire Now; the server log has `not sellable in the OMS … <slug>` → AC-4
- [x] **needs OMS 7.4** Open a product the OMS lists with stock 0 → "Out of stock", button disabled → AC-4
- [x] Add items, reload, open a new tab → the cart is still there; change it in one tab → the other tab's navbar count updates without a reload; `localStorage["vs-cart"]` holds only `v`, `slug` and `qty` → AC-5
- [x] On desktop and on a phone width, the navbar shows the cart icon on every public page with the item total; an empty cart shows no badge; the link's accessible name is "Cart, N items"; the browser console shows no hydration warning → AC-6
- [x] **needs OMS 7.4** `/cart` shows each line's image (or a placeholder), name linking to its page, "Needs a prescription" badge where it applies, unit price, stepper, line total and Remove, then the subtotal and "Delivery fee is calculated at checkout" → AC-7
- [x] **needs OMS 7.4** Set a product's storefront price different from its OMS price → the cart shows the OMS price, and the server log has `storefront and OMS prices differ for <slug>` → AC-8
- [x] **needs OMS 7.4** Put `{"v":1,"items":[{"slug":"<stocked slug>","qty":10}]}` in `vs-cart` for a product with 3 in stock, open `/cart` → the line shows 3 with "Only 3 available, we updated your quantity", and storage now holds 3 → AC-9
- [x] An unlisted or out of stock line in the cart → greyed out, "No longer available online" or "Out of stock", no price, Remove works, left out of the subtotal → AC-9
- [x] With `OMS_BASE_URL` unset (restart the dev server) → product page: Add to cart still works with the "We couldn't check stock right now" notice; `/cart`: prices marked "Estimated", total labeled "Estimated subtotal" → AC-10
- [x] Empty cart → "Your cart is empty" with Browse products; a failing quote on first load → "We couldn't load your cart" with Try again; a failing quote after a change → the banner with Try again; storage is never cleared → AC-11
- [x] A prescription product in the cart → the one note "Checkout will ask for your prescription or a consult booking…" → AC-12
- [x] The summary shows a disabled "Checkout opens soon" button with the reason text under it → AC-13
- [x] At 375px width, `/cart` has no horizontal scroll → AC-7

## Commands
- [x] `npm test` → all pass (includes `cart.test.ts`, `cart-quote.test.ts` and the `getAvailability` tests in `oms.test.ts`) → AC-2, AC-4, AC-5, AC-8, AC-9, AC-10, AC-14, AC-16
- [x] `npx tsc --noEmit` and `npm run lint` → clean
- [x] POST `/api/cart/quote` with 21 entries, `qty: 0`, `qty: 1.5`, a numeric slug, a 101 character slug, `items: "nope"` and a broken JSON body → each 400 with `{ error }`; `{"slug":"../x","qty":1}` → 200 with an `unavailable` line; two `lumela-soap` lines of 7 → one line of 10 → AC-14
- [x] The quote response never contains the word `available` (the raw OMS stock) → AC-14
- [x] With the dev server stopped: `npm run build && npm run start`, then call `/api/cart/quote` twice within 30 seconds → the OMS sees one availability call (check the OMS request log), and a third call after 30 seconds triggers a new one → AC-15
- [x] Search the built client JS (`.next/static`) for the value of `OMS_API_KEY` → not found → AC-14

## Value sourcing checks
- [ ] `name`, `imageUrl`, `requiresPrescription` match the storefront product row (set a primary image on a product and see it in the cart)
- [x] `unitPrice` equals the OMS price when the OMS is up, and the storefront price marked Estimated when it is down
- [x] `maxQty` equals min(OMS available, 10): try stock 3, 10 and 50; stock 0 or a negative value gives Out of stock
- [x] `qty` returned is lowered only when above `maxQty`
- [x] `subtotal` is exact to the centavo: 3 × ₱1,299.90 shows ₱3,899.70
- [x] `estimate` is true only when the OMS was not reached
- [x] Navbar badge equals the sum of quantities in `vs-cart`
- [x] Server logs name only slugs (and the OMS reason code), never request bodies or IPs

## Acceptance-criteria coverage
- AC-1: UI 1 · AC-2: UI 2, npm test · AC-3: UI 3 · AC-4: UI 4, UI 5 · AC-5: UI 6 · AC-6: UI 7 · AC-7: UI 8, UI 16 · AC-8: UI 9, npm test · AC-9: UI 10, UI 11 · AC-10: UI 12 · AC-11: UI 13 · AC-12: UI 14 · AC-13: UI 15 · AC-14: Commands 3, 4, 6 · AC-15: Commands 5 · AC-16: npm test
