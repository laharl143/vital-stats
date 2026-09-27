# 0004. Rationale: online payment through PayMongo, with automatic OMS send

## Context

Checkout (spec 0003) takes cash on delivery only. A COD order waits as `PENDING` until a storefront admin calls the customer and presses Confirm, which sends it to the OMS. "Card or e wallet" is shown as "Coming soon". The OMS side of online payment is already built: its spec 0023 accepts `paymentMethod: prepaid` with a `payment` object (amount, currency, provider, channel, reference, paidAt), checks the amount against its own item prices plus `shippingFee`, and either records the order and payment as paid in one step or refuses the whole request. It gives no stock reservation, so price and stock can move between checkout and send.

The forces are money, trust and duplicates. A browser redirect back from a payment page can be faked or can simply not happen (a closed tab, a dropped connection), so "paid" has to come from the provider's server. Providers deliver webhooks at least once, so the same confirmation will sometimes arrive twice. The OMS can refuse a paid order, which means money was taken for an order that doesn't exist, and someone has to give it back. Customers also abandon payment pages often, and each abandoned attempt must not look like a live order to staff.

Constraints: a small team, Next.js 16 on Vercel style hosting, Prisma on a Supabase Postgres that is also production (so migrations must only add), no queue or cron in the stack today, and Philippine customers who pay mostly with GCash, Maya and QR Ph as well as cards. Compliance: PCI DSS for card payments and RA 10173 (the Data Privacy Act) for the personal data the provider receives. Without a decision, 7.5 stays blocked and every order needs a phone call.

## Options considered

### Provider

**PayMongo (chosen)**. A Philippine gateway with a hosted Checkout Session that covers cards, GCash, Maya, GrabPay, QR Ph and online banking in one integration, signed webhooks, and a refund API.
- Pros: built for the local wallet mix; one session object for every channel; simple onboarding for small merchants; PHP native.
- Cons: Philippines only; some channels (QR Ph, online banking) may not refund through the API; no dedicated MariBank or GoTyme buttons (they're reached through QR Ph).

**Xendit**. Regional (PH, ID, and more) with Invoices and Payment Links covering the same PH wallets.
- Pros: room to grow outside the Philippines; mature refunds and reporting.
- Cons: a heavier API surface and onboarding for a business that sells only in the PH today.

**Maya Business (Maya Checkout)**. Direct from Maya.
- Pros: strong card and Maya wallet support, with QR Ph.
- Cons: weaker GCash coverage, and GCash is the most used wallet.

**DragonPay**. A long established PH aggregator.
- Pros: wide bank and over the counter coverage.
- Cons: clunkier API and slower, less direct payment confirmation for a checkout flow.

### Payment entry

**Hosted checkout redirect (chosen)**. Pros: card data never touches our site (SAQ A); wallets and 3DS handled by PayMongo; the least code. Cons: the customer leaves our site, and styling is limited.

**Embedded fields**. Pros: the customer stays on `/checkout`. Cons: payment intents, a client SDK, 3DS handling and wallet redirects anyway; a wider PCI scope.

### When the order row is created

**Before the redirect, as `AWAITING_PAYMENT` (chosen)**. Pros: reuses the checkoutKey, rate limit, requote and order number from spec 0003; the webhook finds a real row; abandoned attempts are visible. Cons: unpaid rows exist and need expiring.

**Only after payment**. Pros: no unpaid rows. Cons: the whole cart and customer must travel in provider metadata and be rebuilt in the webhook, "payment failed" can't be shown against anything, and reconciliation is harder.

### Status model

**New `AWAITING_PAYMENT` status plus a separate `paymentStatus` (chosen)**. Pros: Confirm already refuses anything not `PENDING`, so an unpaid order can never be sent; money state and fulfilment state stay separate. Cons: one more enum value that every status display must know.

**`paymentStatus` only**. Pros: fewer enum changes. Cons: every place that treats `PENDING` as "ready" needs a new guard, and one missed guard sends an unpaid order.

### Payment storage

**Columns on `Order` (chosen)**. Pros: one payment per order is what the flow produces; no joins. Cons: partial refunds or several attempts per order would need a table later.

**A `Payment` table**. Pros: models many attempts and partial refunds. Cons: more code for a case this flow doesn't create.

### Handling a repeated webhook

**Conditional updates plus unique ids (chosen)**. Pros: the same pattern as the confirm route; no extra table. Cons: no stored history of raw events.

**A `PaymentEvent` table**. Pros: a full event audit. Cons: more storage and code, and the conditional update is still needed for races.

### Recovery (expiry, send retry, refused orders)

**Lazy expiry, retry on webhook repeat or admin button, staff one click refund (chosen)**. Pros: no cron or queue; a human sees every refund. Cons: stale "Awaiting payment" rows until the next read; a send lost in a crashed `after()` waits for a repeat or a click.

**A scheduled job for expiry and resend, and an automatic refund**. Pros: hands off. Cons: new infrastructure and a secret for the cron; an automatic refund loses sales staff could save with a call.

## Rationale

PayMongo wins because the customers are Philippine wallet users first. One hosted Checkout Session covers card, GCash, Maya, GrabPay, QR Ph and online banking, so a single integration serves every channel the engineer asked for, including MariBank and GoTyme through QR Ph. The hosted page keeps card data entirely off VitalStats, which keeps PCI at the lightest level a small team can realistically hold. Xendit is the runner up and the right answer only if the business sells outside the PH.

The rest of the design follows from one rule: only PayMongo may say "paid" (its verified webhook, or its API answering our own check, see the AC-13b update below). Saving the order before the redirect gives that message a real row to land on, and reuses every guard spec 0003 already built (the fresh requote, the exact total check, the checkout key, the rate limit). A separate `AWAITING_PAYMENT` status makes the dangerous mistake (sending an unpaid order to the OMS) impossible through the existing confirm route rather than merely guarded. Conditional writes plus unique ids make repeated webhooks harmless without a new table, which matches how the confirm route and the OMS webhook already work.

Recovery deliberately leans on people and on the admin page staff already use, not on new infrastructure. At current volume, refused paid orders and stuck sends will be rare, and a human seeing each one (and calling the customer) is worth more than an automatic refund. The main cost is lazy expiry and no automatic resend. Both are named in Consequences with a clear point to add a scheduled sweep if they bite. The webhook skips a timestamp window because every write it makes is idempotent, so a replayed message can do nothing harmful, while a strict window could reject PayMongo's own delayed retries.

The engineer chose the recommended option for every question in this run, including the ones decided after they asked to accept all recommendations for the rest of the session.

### Update 2026-09-27: the payment comes from the session, not the event

The first real test mode payments showed that PayMongo's `checkout_session.payment.paid` event arrives before the payment record is attached: both `payments` lists inside it are empty, so the event can say which session was paid but not which payment. The same session fetched a moment later through `GET /v1/checkout_sessions/{id}` holds the full payment. So the event now supplies only the session id, and every payment value (id, amount, currency, channel, paid time) is read from PayMongo's API (AC-6b).

Options weighed: read the payment from the event body (impossible, it isn't there); wait for a separate `payment.paid` event and match it to the session (a second event type to subscribe to, plus a match step with its own race); or fetch the session when the paid event arrives (chosen). Fetching is one extra call per payment and needs no new event type. It is also safer: the payment details come straight from PayMongo's API over our own authenticated call, not from a message body. When the payment isn't attached yet, or PayMongo is down, a `503` makes PayMongo deliver the event again, so a payment is delayed, never lost.

The same test showed PayMongo's page puts its own `+63` in front of the billing phone, so the storefront now sends only the 10 digits after it.

### Update 2026-09-27: ask PayMongo before expiring (AC-13b)

The first real test payment exposed a money gap: when the webhook fails (it did, before AC-6b), the order sits "awaiting payment", and after 60 minutes the lazy expiry would cancel an order the customer had paid for. AC-14 only helps if PayMongo keeps retrying the webhook, and its retries slow down over time and eventually stop. So every expiry now asks PayMongo about the session first, and rescues a paid one through the same path the webhook uses.

The engineer chose: when PayMongo can't be reached, defer the expiry instead of expiring anyway (a stale row during an outage beats a wrongly cancelled paid order); run the same check on the cancel link (one shared expire function, one behaviour); and move the admin list sweep into `after()` so up to 20 PayMongo calls never slow the page. Runner ups were expiring anyway, skipping the check on cancel, and an inline sweep capped at 5. A same model cross check then added the safety details now in AC-13b: defer while the payment intent is `succeeded` but not yet attached (the AC-6b delay), expire the PayMongo session before writing `EXPIRED`, a 2 minute lease on `paymentExpiresAt` so overlapping sweeps and polls can't double check (no new column), a sweep of 5 inside `after()`, and routing every non expired cancel or late replay to `/checkout/done` so a paying customer is never offered a second payment. The alternative of a scheduled reconciliation job was not needed: the lazy reads already visit every stale order, and adding a cron is new infrastructure 0004 deliberately avoided.
