# 0003. Guest checkout with cash on delivery, rechecked through the OMS at submit

**Date**: 2026-09-27
**Status**: Accepted

## Summary

A guest can now turn their cart into a real order on a new `/checkout` page: they type their name, mobile number, email and delivery address, tick one consent box, and place a cash on delivery order. When they press Place order, the server checks stock and prices with the OMS again, adds a flat delivery fee (₱100 in Metro Manila, ₱180 elsewhere), and saves a `PENDING` order that staff confirm and send to the OMS exactly as they do today. Card and e wallet payment shows as "Coming soon" until online payment (7.5) picks a provider, and carts with a prescription product are stopped with a clear path until the prescription step (7.12) exists. A random key sent with each checkout makes a double click or a retry return the same order instead of creating two.

## Requirements

**User stories**:
- As a guest shopper, I want to give my contact details and address and place my order without an account, so buying takes a minute.
- As a guest shopper, I want to see the delivery fee and the exact total before I place the order, so I know what I'll pay the courier.
- As a guest shopper, I want to be told clearly if something sold out or changed price while I was typing, so I never get an order I didn't agree to.
- As the VitalStats owner, I want online orders to land in the admin orders list with everything staff need to call, confirm and send them to the OMS, so the COD flow stays the one we already run.
- As the builder of online payment (7.5) and order emails (7.6), I want the order to already carry its payment method, email, fee and consent, so those features only add their own step.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: On `/cart`, the disabled "Checkout opens soon" button is replaced by a "Checkout" link to `/checkout`. It is enabled only when the cart has at least one line and every line has status `ok`, `adjusted` or `unchecked` and none needs a prescription; otherwise it is shown disabled (`aria-disabled`) with the reason as text beside it ("Remove unavailable items to check out" or the prescription note in AC-2).
- **AC-2**: When the cart holds a prescription product, `/cart` shows the note "Prescription products can't be ordered online yet. Remove them to check out, or book a consult." with a link to `/book-consult`, in place of today's "Checkout will ask for your prescription" note. `/checkout` shows the same note listing those products, each with a Remove button, and no Place order button until they are gone.
- **AC-3**: `/checkout` is a public page (no sign in) with the title "Checkout" and `robots: { index: false }`. It shows a loading state while the quote loads, an empty state ("Your cart is empty" with a link to `/products`) when the cart has no lines, an error state ("We couldn't load your order" with a Retry button) when the quote request fails, and, when any line is `out_of_stock` or `unavailable`, a notice "Some items in your cart can't be ordered right now" with a link back to `/cart` and no Place order button.
- **AC-4**: The form asks for full name (2 to 100 characters), mobile number, email (at most 254 characters, one `@` with text on both sides and a dot in the domain), house or unit number and street (1 to 200), barangay (1 to 100), city or municipality (1 to 100), province (a required select, "Metro Manila" first, then every province in alphabetical order), postal code (exactly 4 digits) and optional delivery notes (at most 300). Each field has a visible label, the matching `autocomplete` value, and an inline error under it after a submit attempt; the page scrolls to and focuses the first invalid field.
- **AC-5**: The mobile number accepts `09XXXXXXXXX`, `9XXXXXXXXX`, `639XXXXXXXXX` or `+639XXXXXXXXX`, ignoring spaces, dashes and brackets, and is saved as `+639XXXXXXXXX`. Anything else shows "Enter a Philippine mobile number, for example 0917 123 4567".
- **AC-6**: The order summary lists each line (name, quantity, line total), the subtotal, the delivery fee and the total. The fee is ₱100.00 when the province is Metro Manila and ₱180.00 for any other province; before a province is chosen the fee line reads "Choose a province to see the delivery fee" and the total is not shown. When the OMS could not be reached, prices and totals are marked "Estimated" with the note "We couldn't check stock right now. We'll confirm availability when we call you."
- **AC-7**: The payment section shows "Cash on delivery" selected, and "Card or e wallet" as a disabled option labelled "Coming soon". Only `cod` is accepted by the server; any other value is refused with 400.
- **AC-8**: One required `ConsentCheckbox` reads "I agree to the Terms and have read the Privacy Notice", with both links opening in a new tab. Submitting without it shows the inline error. The server refuses a request whose `privacyConsent` is not exactly `true` with 400 and `CONSENT_REQUIRED_MESSAGE`, before anything is saved or sent.
- **AC-9**: Placing a valid order saves one `Order` with `source` `STOREFRONT`, `status` `PENDING`, `paymentMethod` `COD`, the customer name, normalized phone as `customerContact`, `customerEmail`, the joined address as `customerAddress`, delivery notes as `notes`, `shippingFee`, `totalAmount` equal to the subtotal plus the fee, `privacyVersion`, `termsVersion`, `consentedAt`, `checkoutKey` and `ipAddress`, plus one `OrderItem` per line with the product name snapshot, quantity and unit price. The response is 201 with the order number and total.
- **AC-10**: After a 201, the cart is cleared and the page swaps to a confirmation in place: heading "Thank you, your order is in", the order number, "We'll call or text you at <phone> to confirm your order before it ships.", and "Pay ₱<total> in cash when it arrives." Focus moves to the heading. Nothing about the order is kept in the browser afterwards.
- **AC-11**: At submit the server quotes the lines again through the OMS. If any line comes back `out_of_stock`, `unavailable` or `adjusted`, nothing is saved and the server answers 409 with code `cart_changed` and the fresh quote. The page then lowers each `adjusted` line in the cart to its new quantity (the same guarded write back as `CartView`), leaves `out_of_stock` and `unavailable` lines in the cart so the customer sees them and removes them (AC-3 then hides Place order until they do), keeps every typed field, and shows "Some items changed. Please review your order and place it again." The reason wording per line is the cart's (spec 0002: "Out of stock", or "No longer available online" for every unavailable cause).
- **AC-12**: The browser sends the total it displayed as `expectedTotal`. If the server's total (fresh subtotal plus fee) differs by even one centavo, nothing is saved and the server answers 409 with code `price_changed`, the fresh quote and the new total. The page shows the new summary with "Prices changed. Please review the new total and place your order again."
- **AC-13**: If the OMS cannot be reached at submit, the order is still saved, priced from the storefront catalog, with `stockUnchecked` set to true. A line whose storefront product is missing, inactive or unpriced still refuses the order with `cart_changed`.
- **AC-14**: A cart with any prescription product is refused by the server with 422 and code `prescription_required`, before anything is saved.
- **AC-15**: The Place order button is disabled and reads "Placing order…" while a request is in flight. Each checkout visit gets a random `checkoutKey` (kept in `sessionStorage` until the order succeeds). A second request with a key that already has an order returns 200 with that same order number and total and creates nothing, even when two requests race (the unique index decides, and the loser reads the winner's order).
- **AC-16**: `POST /api/checkout` rejects a malformed body with 400 and `{ error }`: items breaking the quote rules (not a list, empty, more than 20 lines, a bad slug or quantity), any contact or address field breaking AC-4 or AC-5, a province not in the list, a `checkoutKey` that is not a UUID, or an `expectedTotal` that is not a plain money string.
- **AC-17**: When one IP address already placed 5 storefront orders in the last hour, the next request is refused with 429 "Too many orders from this connection. Please try again later or message us." The check runs after validation and before the save.
- **AC-18**: After a new order is saved, the admins get one email (the existing `notifyAdmin`, new kind `order`) with the order number, customer name, phone, item count, total and "Cash on delivery". A failed email is logged and never fails or delays the customer's response beyond the send attempt; a replayed key sends no second email.
- **AC-19**: In the admin orders list and detail, a storefront order shows an "Online" badge, the customer email, a "Delivery fee" line, the consent line (`formatConsentLine`), and "Stock not checked at checkout" when `stockUnchecked` is true. Admin created orders look as they do today.
- **AC-20**: Confirming a storefront order sends its stored payment method (`cod`) and its `shippingFee` to the OMS, and the admin detail hides the payment method picker for it. Confirming an admin created order sends exactly the same request as today (no `shippingFee` field when the fee is 0).
- **AC-21**: Server logs for checkout carry only the order number (or none), an outcome code and slugs. Never a name, phone, email, address or request body.

## Decision

**Chosen option**: Option 1: One public route handler that rechecks the cart and saves a pending COD order, made safe to retry by a client key

`POST /api/checkout` validates the form, requotes the cart through the same code as `/api/cart/quote`, adds the flat fee, compares the total the customer saw, and saves a `PENDING` storefront order with a unique `checkoutKey`; staff confirm it and send it to the OMS through the existing confirm route.

Picks the owner made in the design conversation (the owner then asked for the recommended option on every remaining question; each one below can be overridden):
- **Online payment until 7.5**: COD works now, "Card or e wallet" shows disabled "Coming soon". Runner up: build the online path to a stub.
- **Prescription products**: block checkout with a clear path (remove, or book a consult). Runner up: allow as COD for staff to handle (the OMS send refuses them, so they would stay pending).
- **Delivery area**: anywhere in the Philippines. Runner up: Metro Manila only.
- **Delivery fee**: two flat rates, ₱100 Metro Manila and ₱180 everywhere else, as constants in code. Runner up: one flat fee.
- **Stale lines at submit**: refuse and show what changed (AC-11). Runner up: drop or trim and place the rest.
- **OMS down at submit**: still place COD orders, flagged for staff (AC-13). Runner up: ask the customer to retry.
- **Price changed at submit**: refuse and show the new total (AC-12). Runner up: place at the new price.

Calls made by the architect (RECOMMEND items, taken as recommended on the owner's instruction):
- **Where the form posts**: a route handler, matching every other `src/app/api` handler and testable with node:test. Runner up: a Server Action (less fetch code, but a new pattern in this repo and harder to unit test).
- **Address shape**: separate fields in the form, joined on the server into the one `customerAddress` string the OMS and the admin address edit already use (format below). Runner up: separate address columns (a bigger migration that the OMS can't use anyway).
- **Province list**: a constant list in code (Metro Manila plus 82 provinces); city and barangay are typed. Runner up: a full city and barangay picker (a large dataset to maintain for little gain).
- **Phone format**: Philippine mobile numbers only, saved as `+639XXXXXXXXX`. Runner up: any phone text (couriers need a mobile they can text).
- **Email**: required and saved on the order, used by 7.6 later. Runner up: optional.
- **Order number**: `VS-YYMMDD-XXXXX` for storefront orders (Manila date, 5 random characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`), retried up to 3 times on a clash. Runner up: keep the cuid (unreadable over the phone).
- **Double submit**: a random UUID per checkout visit, stored as a unique `checkoutKey`. Runner up: disable the button only (a retry after a network drop would still create two orders).
- **Confirmation**: shown in place on `/checkout` after success; the real confirmation and status pages belong to 7.6. Runner up: a new `/checkout/done` route (needs a way to look an order up safely, which is 7.6's design).
- **Rate limit**: 5 storefront orders per IP per hour, counted on saved rows, the same pattern as the consult form. Runner up: none (a public endpoint that writes rows and emails staff).
- **Admin notice**: reuse `notifyAdmin` with a new `order` kind. Runner up: no email (staff would have to watch the list).
- **Payment method storage**: a nullable `paymentMethod` on `Order` (`COD` now, `PREPAID` from 7.5; null for admin orders, whose method is still picked at confirm). Runner up: no column until 7.5 (then confirm could send `prepaid` for a COD customer).
- **Order origin**: a `source` enum (`ADMIN` default, `STOREFRONT`). Runner up: infer it from `checkoutKey` being set (works, but unclear to read and filter on).
- **Customer emails**: none in this feature; 7.6 owns every customer email. Runner up: a plain "order received" email now (7.6 would redo it).
- **References level**: none.

## Feature design

**Data model sketch** (one migration, `add_checkout_order_columns`; only adds nullable or defaulted columns, two enums and two indexes, so no existing row changes):

| Table | New column | Type | Null | Notes |
|---|---|---|---|---|
| `Order` | `source` | `OrderSource` enum (`ADMIN`, `STOREFRONT`) | required, default `ADMIN` | existing rows become `ADMIN`, which is what they are |
| `Order` | `paymentMethod` | `PaymentMethod` enum (`COD`, `PREPAID`) | nullable | `COD` for storefront orders; null means staff pick it at confirm (today's behaviour) |
| `Order` | `customerEmail` | `String` | nullable | required by the checkout validation, null for admin orders |
| `Order` | `shippingFee` | `Decimal(10,2)` | required, default `0` | included in `totalAmount` |
| `Order` | `stockUnchecked` | `Boolean` | required, default `false` | true only when the OMS was unreachable at submit |
| `Order` | `checkoutKey` | `String` | nullable, **unique** | the client UUID; null for admin orders |
| `Order` | `ipAddress` | `String` | nullable | for the rate limit; index `@@index([ipAddress, createdAt])` |
| `Order` | `privacyVersion` | `String` | nullable | from spec 0001 |
| `Order` | `termsVersion` | `String` | nullable | from spec 0001 |
| `Order` | `consentedAt` | `DateTime` | nullable | from spec 0001 |

`totalAmount` keeps its meaning of "what the customer owes": subtotal plus `shippingFee` (admin orders have fee 0, so nothing changes for them). `OrderItem` is unchanged: `productName` snapshot, `quantity`, `unitPrice` (the OMS price, or the storefront price when the OMS was down).

`customerAddress` is joined as `<street>, <barangay>, <city>, <province> <postal code>` (for example `Unit 5B 123 Rizal St, Brgy San Isidro, Makati City, Metro Manila 1200`). Delivery notes go to the existing `notes` column, not the address, so the address the OMS gets stays clean.

**State transitions**: no new states. A storefront order is created `PENDING` and then follows today's path: an admin confirms it (`PENDING` to `CONFIRMED`, sent to the OMS), and the OMS webhook moves it on from there. `CANCELLED` by an admin stays as today.

**Shared code**:
- `src/lib/checkout.ts` (pure, no I/O, unit tested in `src/lib/checkout.test.ts`):
  - `METRO_MANILA = "Metro Manila"`, `PROVINCES` (Metro Manila first, then the 82 provinces alphabetically), `DELIVERY_FEE_CENTAVOS = { metroManila: 10000, provincial: 18000 }`, `deliveryFeeCentavos(province)`.
  - `normalizeMobile(raw): string | null` (AC-5).
  - `validateCheckoutFields(fields)`: returns `Partial<Record<field, message>>` for the AC-4 and AC-5 rules (empty when valid). The client calls it for the inline errors and the server calls it inside `parseCheckout`, so there is one set of rules, never a second copy in the form.
  - `parseCheckout(body)`: returns `{ ok: true, value }` or `{ ok: false, error }` (the first field message, or the items or key message) for every AC-16 rule, reusing `isValidQty`, `MAX_LINES` and the slug rule from the quote route (the item validation moves into `src/lib/cart.ts` as `parseCartLines` so both routes share it). Duplicate slugs merge the same way as the quote route.
  - `joinAddress(parts)` (format above).
  - `makeOrderNumber(now, randomBytes)`: Manila date via `Intl.DateTimeFormat` with `timeZone: "Asia/Manila"`.
  - `checkSubmit(quote, feeCentavos, expectedTotal)`: returns `{ ok: true, totalCentavos }` or `{ ok: false, code: "cart_changed" | "prescription_required" | "price_changed" }`, in that order of precedence (`prescription_required` first).
- `src/lib/load-quote.ts` (server only): the `findMany` plus `getAvailability` plus `buildQuote` plus warning logs, moved out of `src/app/api/cart/quote/route.ts` unchanged. It also selects `Product.id` and returns `productIdBySlug`. The quote route calls it and behaves exactly as before (the existing cart route tests must still pass).
- `sendOrderToOms` in `src/lib/oms.ts`: `OmsOrderInput` gains `shippingFee?: string`; the `/orders` body includes `shippingFee` only when it is above zero, so admin orders send a byte identical request and their OMS idempotency hash does not change.
- `notifyAdmin` gains an `OrderNotification` kind: `{ kind: "order", orderNumber, customerName, phone, itemCount, total }`.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/checkout` | POST | `checkoutKey: uuid` (req), `items: { slug, qty }[]` (req, 1 to 20), `customer: { name, phone, email }` (req), `address: { street, barangay, city, province, postalCode }` (req), `notes: string` (opt), `paymentMethod: "cod"` (req), `expectedTotal: string` (req), `privacyConsent: true` (req) | 201 `{ data: { orderNumber, total } }`; 200 same shape for a replayed key | public, rate limited | 400 `{ error }` malformed or no consent; 409 `{ error, code: "cart_changed" \| "price_changed", quote, total? }`; 422 `{ error, code: "prescription_required", quote }`; 429 rate limit; 500 database failure (logged as `[POST /api/checkout]`) |
| `/checkout` | GET (page) | none | server `page.tsx` with `metadata` title "Checkout" and `robots: { index: false }`, rendering the client `CheckoutView` | public | none |
| `/api/orders/[id]/confirm` | POST (changed) | unchanged body | unchanged | admin (existing) | unchanged; for a storefront order the stored `paymentMethod` wins over the body |

Order of work inside `POST /api/checkout`: parse the body (400), consent (400), look up an existing order by `checkoutKey` (return it with 200), rate limit (429), `loadQuote` (500 on database failure), `checkSubmit` (422 or 409), build the order, `prisma.order.create` with nested items (a unique violation on `checkoutKey` reads the winner's order and returns it with 200, and since the loser created no row it never counts toward the IP limit; a unique violation on `orderNumber` retries with a new number, at most 3 times, and a fourth clash answers 500 "We couldn't place your order. Please try again." and logs outcome `order_number_exhausted`), then `notifyAdmin` inside a try/catch that logs and never fails the response, then 201.

Confirm route for a storefront order: it ignores `body.paymentMethod` entirely (no validation, no 400) and uses `order.paymentMethod.toLowerCase()`; it passes `shippingFee: order.shippingFee.toFixed(2)` (never `toString()`, which can drop the trailing zeros). For an admin order it behaves exactly as today.

Admin edits: the existing `PATCH /api/orders/[id]` may still correct the address of a pending storefront order (typos are common). It does not change `shippingFee` or `totalAmount`: the customer agreed to that total, and the OMS computes the same total from the stored fee, so the courier still collects what the customer saw. If staff move an order across the Metro Manila line, they settle the difference on their confirmation call.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Checkout page | lines, prices, subtotal, statuses | `fetchQuote(useCart().items)` (spec 0002), latest request wins |
| Checkout page | delivery fee | `deliveryFeeCentavos(selected province)` from `src/lib/checkout.ts` |
| Checkout page | total shown and sent as `expectedTotal` | quote `subtotal` plus the fee, in centavos, formatted with `formatCentavos` |
| Checkout page | `checkoutKey` | `crypto.randomUUID()` on first render, kept in `sessionStorage` under `vs-checkout-key` (try/catch; a fresh key when storage is blocked) and removed on success |
| Place order | `source`, `status`, `paymentMethod` | constants `STOREFRONT`, `PENDING`, `COD` |
| Place order | `customerName`, `customerEmail` | request `customer.name`, `customer.email`, trimmed (email lowercased) |
| Place order | `customerContact` | `normalizeMobile(customer.phone)` |
| Place order | `customerAddress` | `joinAddress(address)` |
| Place order | `notes` | request `notes`, trimmed, null when empty |
| Place order | `shippingFee` | `deliveryFeeCentavos(address.province)`, server side (never the request) |
| Place order | `OrderItem.unitPrice`, `productName`, `productId` | the fresh server quote line (`unitPrice`, `name`) and `productIdBySlug` from `loadQuote` |
| Place order | `totalAmount` | fresh quote subtotal plus `shippingFee`, in centavos |
| Place order | `stockUnchecked` | `!quote.omsChecked` |
| Place order | `privacyVersion`, `consentedAt` | `readConsent(privacyConsent)` (spec 0001) |
| Place order | `termsVersion` | `TERMS_VERSION` in `src/lib/legal.ts` |
| Place order | `orderNumber` | `makeOrderNumber(new Date(), crypto.randomBytes)` |
| Place order | `ipAddress` | first `x-forwarded-for` entry, trimmed (`.split(",")[0].trim()`), else `x-real-ip`, else `"unknown"` (as `/api/submit-form` does, plus the trim) |
| Confirmation | order number, total | the 201 or 200 response |
| Confirmation | phone shown | the phone the customer typed, from the form state |
| Admin email | order number, name, phone, item count, total | the saved order |
| Admin detail | badge, email, fee, consent line, stock flag | `source`, `customerEmail`, `shippingFee`, `formatConsentLine(privacyVersion, consentedAt)`, `stockUnchecked` |
| OMS confirm | `paymentMethod`, `shippingFee` | stored `Order.paymentMethod` (lowercased) when set, else the admin's pick; `Order.shippingFee.toFixed(2)` |

**Key invariants**:
- A storefront order is only saved after its lines were requoted on the server in the same request, and every price and the fee come from the server, never from the request.
- `totalAmount` always equals the sum of `quantity * unitPrice` over its items plus `shippingFee`, computed in whole centavos.
- When the OMS was reachable, the total saved equals the total the OMS will compute (OMS prices plus `shippingFee`), so the courier collects what the customer saw.
- One `checkoutKey` maps to at most one order (unique index).
- No storefront order contains a prescription product.
- No order is saved without `privacyVersion`, `termsVersion` and `consentedAt`.
- Admin created orders send the OMS exactly the request they sent before this feature.

**Security model**: The checkout page and endpoint are public; there are no customer accounts yet (7.13). The order holds personal information (name, mobile, email, address, IP address) under RA 10173 but no health data, because prescription products are refused. Consent is recorded per spec 0001. Orders are read only by admins through the existing routes behind `src/middleware.ts` and `requireAdminSession`. The response only returns the order number and total, and a replayed key returns nothing more, so knowing a key reveals no personal data. The OMS key stays server side. Abuse is bounded by the rate limit (AC-17) and the 20 line cap. Logs carry no personal data (AC-21). The order row with its consent columns is the record of what the customer agreed to; later changes by staff go through the existing admin routes.

**Configuration required**: none new. The fees are constants in `src/lib/checkout.ts`. It reuses `OMS_BASE_URL`, `OMS_API_KEY`, `RESEND_API_KEY` and `ADMIN_NOTIFICATION_EMAILS`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: add two stocked products, open `/checkout`, fill every field with a Metro Manila address and an obviously fake name containing "TEST", tick consent, place the order; the confirmation shows the order number and subtotal plus ₱100; the cart is empty; the admin list shows the order as Online and PENDING with the fee, email and consent line; the admin email arrives. Verifies **AC-1**, **AC-3**, **AC-4**, **AC-6**, **AC-8**, **AC-9**, **AC-10**, **AC-18**, **AC-19**
- Unit: `normalizeMobile` for each accepted form, a landline, 10 digits starting with 8, and letters; `deliveryFeeCentavos` for Metro Manila, Cebu and an unknown province; `joinAddress`; `makeOrderNumber` just before and after midnight Manila time; `checkSubmit` precedence (prescription over changed over price). Verifies **AC-5**, **AC-6**, **AC-11**, **AC-12**, **AC-14**
- Unit: `parseCheckout` with each AC-16 bad input, and `paymentMethod: "prepaid"`. Verifies **AC-7**, **AC-16**
- Route: missing consent, `"true"` consent, a 6th order in an hour, a prescription line, a stale line and a wrong `expectedTotal` each save nothing. Verifies **AC-8**, **AC-11**, **AC-12**, **AC-14**, **AC-17**
- Double submit: the same key sent twice in a row and twice at once creates one order, both replies carry the same order number, one admin email is sent. Verifies **AC-15**, **AC-18**
- Stale at submit: lower OMS stock below the cart quantity after the page loads; Place order gets `cart_changed`, the cart quantity is lowered, and the typed fields are kept. Verifies **AC-11**
- OMS down: with `OMS_BASE_URL` unset, the page shows Estimated, the order saves with `stockUnchecked` true, and the admin detail shows "Stock not checked at checkout". Verifies **AC-6**, **AC-13**, **AC-19**
- Confirm to OMS: confirm a storefront order; the OMS request carries `paymentMethod: "cod"` and `shippingFee: "100.00"`; confirm an admin order and the request body is unchanged from today (the existing `oms.test.ts` payload assertions still pass). Verifies **AC-20**
- Prescription: a cart with a prescription product shows the note on `/cart` and `/checkout` and no way to place the order. Verifies **AC-1**, **AC-2**
- Logs: run the happy path and the failures and search the server output for the test name, phone and email; none appear. Verifies **AC-21**
- Auth/permission: a signed out request to the admin orders API still gets 401 and the admin page redirects to `/admin/login`; the checkout response never contains the address or email. Verifies **AC-9**, **AC-19**

## Build plan

The build approach is Journey, and this is the third stop on Journey 1 (consent, cart, then checkout). It is built as one end to end slice so the whole guest path can be tried against the real OMS as soon as the route lands: schema, pure rules, the route, then the customer screens, then the admin side that picks the orders up. One migration.

1. [x] Migration `add_checkout_order_columns`: the two enums and the columns and indexes in the data model sketch. Only adds, so it is safe on the shared Supabase database. Satisfies **AC-9**, **AC-13**, **AC-15**, **AC-17**, **AC-19**
2. [x] `src/lib/checkout.ts` and `src/lib/checkout.test.ts` (node:test, added to the `test` script); move the line validation into `parseCartLines` in `src/lib/cart.ts`. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-11**, **AC-12**, **AC-14**, **AC-16**
3. [x] Extract `src/lib/load-quote.ts` from the quote route (plus `Product.id`); the quote route uses it with no change in behaviour. Satisfies **AC-11**, **AC-13**
4. [x] `POST /api/checkout` in the order of work above, with route tests beside the cart route tests, and the `order` kind in `notifyAdmin`. Satisfies **AC-8**, **AC-9**, **AC-11** to **AC-18**, **AC-21**
5. [x] `/checkout` page: server `page.tsx` with metadata and noindex, client `src/components/checkout/CheckoutView.tsx` with the form, summary, fee, payment options, consent, all states, the key in `sessionStorage`, the write back on `cart_changed`, and the in place confirmation. Satisfies **AC-2** to **AC-8**, **AC-10** to **AC-12**, **AC-15**
6. [x] `/cart`: the Checkout link with its enable rule and reasons, and the new prescription note. Satisfies **AC-1**, **AC-2**
7. [x] Admin: the Online badge, email, fee line, consent line and stock flag in `src/app/admin/orders/page.tsx`; the confirm route uses the stored payment method and passes `shippingFee`; `sendOrderToOms` sends `shippingFee` only when above zero, with tests in `src/lib/oms.test.ts`. Satisfies **AC-19**, **AC-20**

After `/develop`, the Beta workflow runs `/check verify`, then `/test`.

## Consequences

**Positive**:
- Customers can finish an order by themselves, and staff keep the COD confirm flow they already use.
- The total a customer sees is the total the OMS and the courier use, and any change is shown before the order is saved.
- Online payment (7.5) only adds the provider step: the order already has a payment method, a fee, an email and consent.
- A double click, a network retry or two tabs can't create two orders.

**Negative / tradeoffs**:
- Customers who want to pay by card or e wallet can't yet; some will leave.
- Prescription products can't be bought online until 7.12, even though the cart lets people add them.
- The fee is a guess until the owner checks real courier rates, and two rates can't reflect far provinces or cold chain costs.
- During an OMS outage, orders are saved without a stock check; staff find out at confirm if something is gone, and must call the customer.
- A fresh page load after placing an order loses the confirmation (the cart is empty and nothing is stored); the customer has only what they saw, until 7.6 adds the email and status page.
- An IP address is now stored on storefront orders for the rate limit; it is personal data and must be covered by the privacy notice and retention rules.
- Shared offices or mobile carriers behind one IP could hit the 5 per hour limit.
- The rate limit counts saved rows and then saves (the consult form pattern), so a burst of simultaneous requests from one IP can slip a few orders past 5. Accepted for now with a `ponytail:` comment in the route; every order still waits for a staff call, and a per IP counter row with an atomic increment is the upgrade if it is ever abused.
- An admin address correction does not recompute the delivery fee (see the admin edits note under API surface).

**Neutral**:
- One additive migration on the Supabase database that is also production.
- A new public route `/checkout` and a new public endpoint `/api/checkout`.
- Storefront orders get a readable `VS-YYMMDD-XXXXX` number while admin orders keep their cuid.

## Follow-up

- [ ] Owner: check the ₱100 and ₱180 fees against real courier rates before go live, and change the constants if needed.
- [ ] Owner, at the legal review from spec 0001: make sure the privacy notice lists the email, IP address (kept for abuse prevention) and delivery address collected at checkout, then bump `PRIVACY_VERSION`.
- [ ] 7.5 Online payment (VS-255): enable "Card or e wallet", set `paymentMethod` `PREPAID`, and send the order to the OMS with its payment and `shippingFee` automatically.
- [ ] 7.6 Order confirmation and emails (VS-256): a real confirmation and status page (replacing the in place confirmation), and the customer emails using `customerEmail`.
- [ ] 7.7 Analytics (VS-257): checkout started and order placed events with no personal data.
- [ ] 7.12 Prescription step (VS-259): replace the prescription block on `/cart` and `/checkout` with the upload or consult step.
- [ ] 7.13 Customer accounts (VS-260): fill the checkout form from the saved address for a signed in customer.
- [ ] Admin created orders still have no online consent (spec 0001 follow up); unchanged by this feature.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
