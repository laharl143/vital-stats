# Verify: checkout · spec 0003 · updated 2026-09-27
_Steps derived from spec 0003 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Marks: `[x]` passed in the in-app browser or against the dev server on 2026-09-27 (`/develop` run, test order `VS-260927-6G64D`, name "TEST Checkout Buyer", safe to delete). `[ ]` not yet checked.

## UI / manual
- [x] Put `lumela-soap` and an item the OMS doesn't list in the cart, open `/cart` → Checkout is disabled with "Remove unavailable items to check out." → AC-1
- [x] Remove the unavailable item → Checkout becomes a link to `/checkout` → AC-1
- [x] Put a prescription product in the cart → `/cart` and `/checkout` show "Prescription products can't be ordered online yet…" with a Book a consult link, `/checkout` lists it with Remove and has no Place order → AC-2 (✓ /check verify: tirzepatide, which is also unpriced, so it shows as unavailable too)
- [x] `/checkout` has the title "Checkout | VitalStats Philippines" and `robots` noindex → AC-3
- [x] Empty cart on `/checkout` → "Your cart is empty" with Browse products; quote endpoint failing → "We couldn't load your order" with Try again → AC-3 (✓ /check verify: quote forced to 500 in the tab, Try again recovered, cart kept)
- [x] Press Place order with every field empty → each field shows its error, focus lands on Full name → AC-4
- [x] Type `+63 (917) 555-0101`, `9175550101` and `0288123456` → the first two are accepted, the landline shows the mobile number message → AC-5 (✓ /check verify)
- [x] No province → the fee line reads "Choose a province to see the delivery fee" and no total shows; Metro Manila → ₱100.00 and ₱400.00 for 2 × ₱150; Cebu → ₱180.00 and ₱480.00 → AC-6
- [x] With `OMS_BASE_URL` unset, the summary shows "Estimated" and the "We couldn't check stock right now…" note → AC-6, AC-13 (✓ reverify after /debug: fake OMS down 31 s → "Estimated" on the line, subtotal and total plus the note; `VS-260927-8DFHU` saved with `stockUnchecked` true and the admin detail shows "Stock not checked at checkout")
- [x] Payment shows Cash on delivery selected and "Card or e wallet · Coming soon" disabled → AC-7
- [x] Everything filled but consent unticked → no request is sent, focus moves to the consent box with the error → AC-8
- [x] Tick consent and place → "Thank you, your order is in", order number, "We'll call or text you at 0917 555 0101…", "Pay ₱400.00 in cash when it arrives.", focus on the heading, cart badge "Cart, 0 items", `vs-checkout-key` removed → AC-10
- [x] Lower the OMS stock below the cart quantity after the page loads, then place → "Some items changed…", the cart quantity drops, typed fields stay → AC-11 (✓ reverify after /debug: stock 5→1 with the cart cache warm, no wait → banner, cart lowered to 1, fields and consent kept, total ₱250; placing again saved `VS-260927-D3VFK` for 1; the first submit saved nothing)
- [x] Admin orders (signed in): the test order shows the Online badge, email, "Delivery fee ₱100", the consent line and Total ₱400; the confirm panel shows "Payment method: Cash on delivery (chosen by the customer at checkout)" with no picker → AC-19, AC-20 (✓ /check verify, Ed signed in; not sent)
- [x] Admin orders: an admin created order still shows the payment picker and no Online badge → AC-19, AC-20 (✓ /check verify: TEST Admin Form VS-245)

## Commands
- [x] Saved row for `VS-260927-6G64D` (read only query): `source` STOREFRONT, `status` PENDING, `paymentMethod` COD, `customerContact` `+639175550101`, `customerEmail` lowercased, `customerAddress` "TEST Unit 1 Sample St, TEST Barangay, Makati City, Metro Manila 1200", `notes` set, `shippingFee` 100, `totalAmount` 400, `stockUnchecked` false, `checkoutKey`, `ipAddress`, `privacyVersion`/`termsVersion` 2026-09-26, `consentedAt` set, one item (Luméla Soap × 2 at 150) → AC-9
- [x] POST `/api/checkout` again with the same `checkoutKey` → 200 with the same order number and total, no second row → AC-15
- [x] POST with `expectedTotal` "399.00" → 409 `price_changed` → AC-12
- [x] POST with `privacyConsent: "true"` → 400 with the consent message → AC-8
- [x] `GET /api/orders` while signed out → 401 → security model
- [x] `npm test` → 126 pass, including `checkout.test.ts` (11) and `checkout-routes.test.ts` (14: consent, malformed bodies, replay, race, rate limit, prescription, cart changed, price changed, OMS down, number clash, database failure, no personal data in logs) → AC-5 to AC-9, AC-11 to AC-18, AC-21
- [x] `oms.test.ts` delivery fee test: `shippingFee` sent when above zero, request bytes unchanged when zero → AC-20
- [ ] Confirm a storefront order in admin (a real OMS send, only with Ed's go ahead) → the OMS request carries `paymentMethod: "cod"` and `shippingFee: "100.00"` → AC-20
- [x] Check the admin email for the test order: order number, name, phone, 2 items, ₱400.00, Cash on delivery, and no address or email → AC-18 (✓ /check verify: one email per order, body has no address or email; sent to the 3 admin recipients)
- [x] Server log for the test order holds only `{"event":"checkout","orderNumber":"VS-260927-6G64D","outcome":"placed"}` and no name, phone, email or address → AC-21 (✓ /check verify: 3100 server log for `VS-260927-HGEHB` has only the outcome line)

## Value sourcing
- [x] Fee comes from the province, not the request: Metro Manila 100, Cebu 180 (UI), and the saved `shippingFee` is 100 → Value sourcing: `shippingFee`
- [x] Unit price saved is the OMS price (150.00) from the fresh server quote → Value sourcing: `OrderItem.unitPrice`
- [x] Phone saved normalized from the typed `0917 555 0101` → Value sourcing: `customerContact`
- [x] Order number uses the Manila date (`VS-260927-…` for an order placed 13:00 Manila time) → Value sourcing: `orderNumber`
- [x] `privacyVersion`/`termsVersion` equal the constants in `src/lib/legal.ts`, not anything sent → Value sourcing: consent

## /check verify 2026-09-27 · FAIL, then PASS after /debug
Root cause for both failures: `getAvailability` in `src/lib/oms.ts` uses `next: { revalidate: 30 }`, which is stale while revalidate. The first request after 30 s gets the old answer and only triggers a background refresh; a failed refresh keeps the old answer forever. So the checkout submit check (AC-11), the OMS down path (AC-6, AC-13) and spec 0002 AC-15 ("at most 30 seconds") can all run on stale stock. Fixed by `/debug checkout` (strict 30 s in memory cache with `no-store`, failures never kept, `fresh: true` at checkout submit). Reverified the same day on a production build against the fake OMS: PASS.

## Acceptance-criteria coverage
- AC-1 browser ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 ✓ · AC-5 ✓ · AC-6 ✓ · AC-7 ✓ · AC-8 ✓ · AC-9 ✓ · AC-10 ✓ · AC-11 ✓ · AC-12 ✓ · AC-13 ✓ · AC-14 route tests ✓ · AC-15 ✓ · AC-16 tests ✓ · AC-17 route tests ✓ · AC-18 ✓ · AC-19 ✓ · AC-20 ✓ (real OMS send not run) · AC-21 route tests ✓
