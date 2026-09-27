# Verify: online payment and automatic send to OMS · spec 0004 · updated 2026-09-27
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Use PayMongo TEST keys (`sk_test_…`) and TEST named customers only. The dev database is production: never delete or bulk update real rows._

## UI / manual

Setup (once): put `PAYMONGO_SECRET_KEY=sk_test_…` and `PAYMONGO_WEBHOOK_SECRET=whsk_…` in `.env`, restart `npm run dev`, and expose the dev server so PayMongo can reach `/api/paymongo/webhook` (e.g. a tunnel), registered for `checkout_session.payment.paid`.

- [x] Without `PAYMONGO_SECRET_KEY`: `/checkout` shows "Card or e wallet · Unavailable right now" disabled; COD places an order exactly as before → AC-1
- [x] With keys: "Card or e wallet" is selectable and lists card, GCash, Maya, GrabPay, QR Ph (MariBank, GoTyme) and online banking; the button reads "Continue to payment · ₱…" → AC-1
- [x] Place an online order (TEST name) → redirected to PayMongo; the admin list shows it as "AWAITING PAYMENT" with no Confirm button; no admin email yet → AC-2, AC-17, AC-18
- [x] On PayMongo's page, the line items show each product at its unit price × qty plus "Delivery fee", and the total equals the checkout total → AC-2
- [x] Double click "Continue to payment" (or go back and press it again) → the same PayMongo URL, still one order in admin → AC-5
- [x] Pay with a PayMongo test card → `/checkout/done` shows "Confirming your payment…", then "Thank you, your order is paid" with the order number; the cart is empty → AC-6, AC-7, AC-16
- [x] Admin: the order shows "Paid · ₱… · card", the PayMongo payment id and paid on time; it becomes CONFIRMED with an OMS order id without anyone clicking; the admin email says "Paid online (card)" → AC-7, AC-8, AC-18
- [x] In the OMS, the order exists as PENDING_VERIFICATION with payment status paid, amount, provider paymongo, channel, reference and the delivery fee → AC-8
- [x] Open `/checkout/done?key=<that key>` before paying (from a fresh checkout) → it keeps polling, then after 60 s shows "Still confirming your payment…"; nothing in admin becomes paid → AC-6, AC-16
- [x] Start a payment and press PayMongo's back/cancel link → `/checkout` shows "Payment cancelled. Your cart is still here." with the cart intact; admin shows the order CANCELLED, "Payment expired"; the next attempt creates a new order → AC-15
- [x] Start a payment, then set nothing and wait past 60 min (or open the admin list after the window) → the order becomes CANCELLED / "Payment expired" → AC-13
- [ ] Pay, but make the webhook fail (e.g. stop the tunnel), then open the admin list after the 60 minute window → the order becomes PAID and is sent to the OMS instead of "Payment expired"; with PayMongo unreachable it stays "Awaiting payment" → AC-13b (step 19b)
- [x] Pay on PayMongo, then press its cancel/back link before the webhook lands (tunnel stopped) → `/checkout` goes to `/checkout/done?key=…` (same key), which shows the order paid; no "Payment cancelled" notice, no second order → AC-15, AC-13b
- [x] Press PayMongo's cancel link without paying → "Payment cancelled. Your cart is still here." appears only after the server answers; the next Place order uses a new key and a new order → AC-15
- [ ] With PayMongo unreachable (wrong `PAYMONGO_SECRET_KEY` host blocked, or offline), open `/api/checkout/status?key=…` for a stale order twice within 2 minutes → `awaiting_payment` both times, and the logs show one `expire_deferred` (the lease stops the second PayMongo call) → AC-13b
- [ ] Open the admin orders list with stale "Awaiting payment" rows → the list loads at once; on the next load at most 5 of them have changed → AC-13, AC-13b
- [x] Send a correctly signed paid event for a `cs_…` that belongs to another PayMongo account or mode → answered 200, the log shows `session_not_found`, nothing changes → AC-6b
- [x] Stop the OMS (or point `OMS_BASE_URL` at a dead host) and pay → admin shows "Paid, not sent to OMS" with the reason and a Send to OMS button; with the OMS back, Send to OMS confirms it → AC-10, AC-19
- [x] Make the OMS refuse a paid order (e.g. deactivate the product in the OMS after checkout) → admin shows "Refund needed" with a plain reason, a refund email arrives; `/checkout/done` says "We received your payment but couldn't place your order…" → AC-11, AC-16, AC-18
- [x] On that order press "Refund ₱…" → PayMongo test refund created; order shows Refunded with the PayMongo refund id and CANCELLED; pressing again is refused → AC-12
- [ ] For a refund PayMongo refuses (e.g. a UBP online banking test payment), the reason shows and "Mark refunded manually" takes a note; the note lands in admin notes → AC-12
- [ ] Cancel a sent paid order in the OMS → storefront order becomes CANCELLED with "Refund needed" and a refund email → AC-11b
- [x] Admin: pressing CANCELLED on a PAID order is refused with "Refund this order instead"; status buttons on an AWAITING_PAYMENT order are disabled with "This order is waiting for online payment…" → AC-17

## Value sourcing checks
- [x] Line item amounts: a cart with one line at qty 3 → PayMongo shows unit price with quantity 3, not the line total → Value sourcing (line item amount)
- [x] Delivery fee: a provincial address → the fee line is ₱180, Metro Manila → ₱100 → Value sourcing (delivery fee line)
- [ ] Session total equals `totalAmount` to the centavo, including prices with centavos (e.g. ₱149.95) → Value sourcing (session total)
- [x] `paymentExpiresAt` is createdAt plus 60 minutes → Value sourcing (paymentExpiresAt)
- [ ] Return links point at `NEXTAUTH_URL` (`/checkout/done?key=…` and `/checkout?cancelled=…`); wrong `NEXTAUTH_URL` → online shows unavailable → Value sourcing (success_url, cancel_url)
- [x] Billing on PayMongo's page is prefilled with the TEST name, email and phone → Value sourcing (billing)
- [x] Webhook finds the order by session id only: a paid event for an unknown `cs_…` is answered 200 and changes nothing → Value sourcing (which order)
- [x] Pay with GCash, Maya and QR Ph in test mode → admin channel shows `gcash`, `maya` (never `paymaya`), `qrph` → Value sourcing (paymentChannel)
- [x] `paidAmount` and `paidAt` in admin match PayMongo's dashboard for that payment → Value sourcing (paidAmount, paidAt)
- [x] The OMS payment record matches the stored columns (amount, currency, provider `paymongo`, channel, reference `pay_…`, paidAt) → Value sourcing (OMS send)
- [x] The refund amount in PayMongo equals the full paid amount → Value sourcing (refund amount)
- [x] `/api/checkout/status?key=…` returns only orderNumber, total and state → Value sourcing (status endpoint state)
- [x] PayMongo's refund API takes the amount in centavos (a ₱750.00 refund shows as ₱750.00, not ₱7.50 or ₱75,000) → Value sourcing (refund amount), unit not confirmed by the doc check

## Commands
- [x] `npm test` → 188 pass, 0 fail (includes `paymongo.test.ts` and `payment-routes.test.ts`) → AC-2 to AC-20
- [x] `npx tsc --noEmit -p .` → no errors → all
- [x] `npx eslint src` → no errors → all
- [x] `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` → exit 0 (schema live) → AC-2, AC-7

## Acceptance-criteria coverage
- AC-1 UI steps 1, 2 · AC-2 steps 3, 4 plus the line item, fee and total checks · AC-3 `payment-routes.test.ts` (OMS unreachable) · AC-4 `payment-routes.test.ts` (PayMongo down) · AC-5 step 5 · AC-6 steps 6, 9 · AC-6b `payment-routes.test.ts` (payment not attached yet → 503, then retry) and the real test payment VS-260927-25FCY · AC-7 steps 6, 7 · AC-8 steps 7, 8 · AC-9 `payment-routes.test.ts` (same event twice) · AC-10 step 12 · AC-11 step 13 · AC-11b step 16 · AC-12 steps 14, 15 · AC-13 step 11 · AC-13b step 19b and `payment-routes.test.ts` (paid at expiry is rescued, PayMongo down defers, no payment expires) · AC-14 `payment-routes.test.ts` (late payment) · AC-15 step 10 · AC-16 steps 6, 9, 13 · AC-17 steps 3, 17 · AC-18 steps 3, 7, 13 · AC-19 step 12 · AC-20 `payment-routes.test.ts` (logs)
