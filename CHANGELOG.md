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

### Changed
- The cart's "Checkout opens soon" button is now a Checkout link. It stays disabled, with the reason beside it, while the cart holds an unavailable item or a prescription product. (VS-254)
- Prescription products can't be ordered online yet: the cart and checkout say so and link to Book a consult, and the server refuses such an order. (VS-254)
- Confirming an online order in admin sends the payment method the customer chose at checkout and its delivery fee to the OMS; the payment method picker is hidden for those orders. Confirming an admin created order sends exactly the same request as before. (VS-254)

### Fixed
- Stock and price checks against the OMS could use an answer of any age, and while the OMS was down the last good answer kept being reported as checked, so an out of stock item could slip through checkout. Cart views now reuse an OMS answer for at most 30 seconds, never keep a failed call, and checkout always asks the OMS fresh when the customer places the order. (VS-254, see spec 0002 and 0003)
