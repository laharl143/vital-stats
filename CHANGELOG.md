# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Guest checkout at `/checkout`: customers enter their name, Philippine mobile number, email and delivery address (province picked from a list), tick one consent box for the Terms and Privacy Notice, and place a cash on delivery order. Card and e wallet payment shows as "Coming soon". (VS-254, see spec 0003)
- A flat delivery fee on every online order: ₱100 in Metro Manila and ₱180 everywhere else, shown in the order summary before the customer places the order and sent to the OMS as the delivery fee when staff confirm it. (VS-254, see spec 0003)
- `POST /api/checkout` saves a pending storefront order only after checking every line again with the OMS. Changed stock or prices are refused with a clear message and nothing is saved; a double submit or a retry returns the same order instead of creating a second one; one connection can place at most 5 orders an hour. (VS-254, see spec 0003)
- Admins get one email for each new online order (order number, name, phone, item count, total, cash on delivery), with no address or email in it. (VS-254)
- The admin orders page marks online orders with an "Online" badge and shows the customer email, the delivery fee, the consent record, and a "Stock not checked at checkout" warning when the OMS was unreachable. (VS-254)
- Database migration `add_checkout_order_columns`: order source, payment method, customer email, delivery fee, stock checked flag, retry key, IP address and consent columns on `Order`. It only adds columns; existing orders are unchanged. (VS-254)
- Online payment at checkout through PayMongo's hosted payment page: card, GCash, Maya, GrabPay, QR Ph (any bank app, including MariBank and GoTyme) and online banking. The order is saved as awaiting payment, the customer pays on PayMongo's page, and card or wallet details never reach our server. The option is available only when PayMongo and the OMS are both configured; cash on delivery works as before. (VS-255, see spec 0004)
- An order becomes paid only from PayMongo's own answer: its signed webhook (`/api/paymongo/webhook`), or our own check with PayMongo before an unpaid order is cancelled. Coming back to the site or pressing cancel never marks an order paid by itself, and a customer who did pay is never shown "Payment cancelled". (VS-255, see spec 0004)
- A paid order is sent to the OMS on its own, with its payment record (amount, channel, PayMongo reference, paid time) and delivery fee, so no one needs to press Confirm. (VS-255, see spec 0004)
- A return page at `/checkout/done` shows whether the payment went through: paid, still confirming, payment not completed, refund needed, or refunded. It clears the cart only once the order is paid. (VS-255, see spec 0004)
- Unpaid online orders expire after 60 minutes, and their PayMongo payment page is closed too. Expiry happens the next time the order is looked at (the admin orders list, the return page or checkout), not on a timer. (VS-255, see spec 0004)
- Admin orders show an "Awaiting payment" filter and badge, and each online order's payment details: status, amount, channel, PayMongo payment id, paid time and any refund. A paid order that couldn't reach the OMS shows "Paid, not sent to OMS" with a Send to OMS button. (VS-255, see spec 0004)
- Refunds from the admin order page: a one click full refund through PayMongo, or "Mark refunded manually" with a required note when PayMongo can't refund that channel. (VS-255, see spec 0004)
- When the OMS refuses a paid order for good (for example, a product is inactive), or cancels one after it was sent, the order is flagged "Refund needed" and admins get a refund needed email. (VS-255, see spec 0004)
- New environment variables `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET`. (VS-255)
- Database migration `add_online_payment_columns`: an `AWAITING_PAYMENT` order status, a payment status, and PayMongo session, payment and refund columns on `Order`. It only adds values and columns; existing orders are unchanged. (VS-255)

### Changed
- The cart's "Checkout opens soon" button is now a Checkout link. It stays disabled, with the reason beside it, while the cart holds an unavailable item or a prescription product. (VS-254)
- Prescription products can't be ordered online yet: the cart and checkout say so and link to Book a consult, and the server refuses such an order. (VS-254)
- Confirming an online order in admin sends the payment method the customer chose at checkout and its delivery fee to the OMS; the payment method picker is hidden for those orders. Confirming an admin created order sends exactly the same request as before. (VS-254)
- "Card or e wallet" at checkout is no longer "Coming soon": it takes the customer to PayMongo, as described under Added. (VS-255)
- For online paid orders, the admin new order email goes out once the order is paid, not when it is placed, and says "Paid online" with the channel. (VS-255)
- Admins can't change the status of an order that is awaiting online payment, and can't cancel a paid order by status (they refund it instead). Confirm refuses a prepaid order that hasn't been paid. (VS-255)

### Fixed
- Stock and price checks against the OMS could use an answer of any age, and while the OMS was down the last good answer kept being reported as checked, so an out of stock item could slip through checkout. Cart views now reuse an OMS answer for at most 30 seconds, never keep a failed call, and checkout always asks the OMS fresh when the customer places the order. (VS-254, see spec 0002 and 0003)
