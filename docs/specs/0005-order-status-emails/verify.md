# Verify: order status page and emails · spec 0005 · updated 2026-09-28
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. Use a name containing "TEST" for every order._

## UI / manual
- [x] Add a stocked product, check out with cash on delivery (name "TEST Buyer", Metro Manila address) → the browser lands on `/orders/<43 char token>?new=1`, heading "Thank you, your order is in" has focus, the cart is empty → AC-1, AC-2, AC-8
- [x] On that page → order number, "Placed <today, Manila>", the progress line on Received, each item with quantity and line total, subtotal + ₱100 fee = total, "Pay ₱<total> in cash when it arrives.", "Delivering to TEST, <city>, Metro Manila" → AC-5, AC-7
- [x] View the page source → no phone, email, street, barangay, postal code, admin notes or OMS/PayMongo ids → AC-5
- [x] Reload without `?new=1` → heading "Your order", no thank you line → AC-8
- [x] Open `/orders/` + 43 random base64url characters, and `/orders/abc` → the same 404 page → AC-4
- [x] Admin orders, open the TEST order → "Customer link" with Copy (the copied URL opens the same page) and one "Order received email" row (sent, or failed when Resend can't deliver to that address) → AC-15, AC-9
- [ ] PayMongo test mode: pay an online TEST order → `/checkout/done` moves on to `/orders/<token>?new=1`, "Paid online (<channel>)" → AC-3, AC-7
- [x] Admin: set an unsent TEST COD order to Cancelled → the status page shows "This order was cancelled." and the admin email list gains "Cancelled" → AC-6, AC-9
- [ ] An online TEST order left unpaid past 60 minutes, opened by its link → "Payment not completed." and no cancelled email → AC-4, AC-7, AC-9

## Commands
- [x] `npm test` → all pass, including `src/lib/notify-customer.test.ts` → AC-9 to AC-14
- [x] Server logs after the steps above → `customer_email` lines carry order number, kind and outcome only; no token, email or name → AC-14

## Value sourcing checks
- [x] Street with a comma ("Unit 5, 12 Rizal St") → the delivery line still shows the right city and province → AC-5
- [x] A province order (₱180 fee) → subtotal is total minus ₱180 → AC-5
- [x] Email link host → `NEXTAUTH_URL` + `/orders/<token>` → AC-11
- [ ] Refund email for a GCash order → "₱<paidAmount> was refunded to your GCash." → AC-12

## Acceptance-criteria coverage
- AC-1, AC-2, AC-8: first UI step · AC-3: PayMongo step · AC-4: 404 and expiry steps · AC-5: page, source and value checks · AC-6: cancel step · AC-7: page, PayMongo and expiry steps · AC-9: admin, cancel and `npm test` · AC-10 to AC-14: `npm test` and logs · AC-15: admin step
