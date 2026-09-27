# 0004. Online payment through PayMongo, with paid orders sent to the OMS automatically

**Date**: 2026-09-27
**Status**: Accepted

## Summary

Customers can now pay at checkout by card, GCash, Maya, GrabPay, QR Ph (which covers MariBank, GoTyme and other bank apps) or online banking, through PayMongo's hosted payment page. When they press Place order, the order is saved as awaiting payment and they are sent to PayMongo. Only PayMongo itself can make an order paid: its signed webhook (a message PayMongo's server sends ours), or our own check with PayMongo's API before an unpaid order expires. The customer returning to our site never can. Once paid, the order is sent to the OMS on its own with its payment record, so no admin step is needed. Unfinished payments expire after 60 minutes. If the OMS refuses a paid order, it is flagged for staff, who can refund it with one click.

Jira: [VS-255](https://vital-stats.atlassian.net/browse/VS-255). Builds on [0003](../0003-checkout/index.md) (checkout) and the OMS's spec 0023 (paid orders through the public API).

## Requirements

**User stories**:
- As a guest shopper, I want to pay online with my card or e wallet when I place my order, so I don't need cash when the courier comes.
- As a guest shopper, I want to see clearly whether my payment went through, so I never pay twice or wonder if my order exists.
- As a guest shopper who paid but whose order couldn't be filled, I want my money back without chasing anyone.
- As the VitalStats owner, I want a paid order to reach the OMS ready to fulfil with no one clicking Confirm, so paid customers are served fast.
- As a storefront admin, I want to see every online order's payment state, retry a stuck send, and refund a refused order from the order page.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: On `/checkout`, "Card or e wallet" is enabled when `PAYMONGO_SECRET_KEY`, `OMS_BASE_URL` and `OMS_API_KEY` are all set. Its note lists card, GCash, Maya, GrabPay, QR Ph ("any bank app, including MariBank and GoTyme") and online banking. When any of those variables is missing, it stays disabled with the note "Unavailable right now". Cash on delivery still works exactly as in spec 0003.
- **AC-2**: Placing an online order (`paymentMethod: "online"`) runs the same field validation, consent check, rate limit, fresh OMS requote and exact total check as a COD order (spec 0003). It then saves the order with `status` `AWAITING_PAYMENT`, `paymentMethod` `PREPAID`, `paymentStatus` `UNPAID` and `paymentExpiresAt` set to now plus 60 minutes. It creates one PayMongo checkout session whose line items (each product, plus a "Delivery fee" line) add up to exactly the order's `totalAmount`, stores the session id and URL, and answers `201` with `{ orderNumber, total, checkoutUrl }`. The browser then goes to `checkoutUrl`.
- **AC-3**: An online order is refused with `409`, code `online_unavailable`, and no order is saved, when the requote could not reach the OMS (the quote is not OMS checked). A guard for a quote currency other than `PHP` is kept as a safety check only: `buildQuote` always sets `PHP` today, so no test can reach it. The message is "Online payment is unavailable right now. Please choose cash on delivery or try again in a moment."
- **AC-4**: If creating the PayMongo session fails, the saved order is set to `status` `CANCELLED` and `paymentStatus` `EXPIRED`, the answer is `502` with the same message as AC-3, and the cart in the browser is untouched.
- **AC-5**: Repeating Place order with the same `checkoutKey` while that order is still `AWAITING_PAYMENT` and inside its payment window returns the stored `checkoutUrl` and creates no second order and no second session. A repeat on an order that is no longer awaiting payment, or is awaiting payment but past `paymentExpiresAt` (a deferred expiry, AC-13b), returns `{ orderNumber, total, paymentState }` with no `checkoutUrl`, and the browser goes to `/checkout/done?key=…`.
- **AC-6**: An order becomes paid only from a payment PayMongo's API returns for that order's stored session id: through a `checkout_session.payment.paid` webhook whose `Paymongo-Signature` verifies against `PAYMONGO_WEBHOOK_SECRET` (AC-6b), or through the check before expiry (AC-13b). A webhook with a missing or wrong signature gets `401` and changes nothing. Visiting the success URL, polling the status endpoint or pressing cancel never makes an order paid by itself.
- **AC-6b**: The paid event only says which session was paid: PayMongo sends it before the payment record is attached, so the session's payment list inside the event is empty. The webhook therefore reads the payment from `GET /v1/checkout_sessions/{id}` (the id taken from the verified event). The fetched session's `id` must equal the event's session id. Failures split by whether a retry can help: no payment attached yet, a network error, a timeout or a PayMongo `5xx` answer `503` (write nothing, PayMongo delivers the event again); a PayMongo `404` or other `4xx` (for example an event from another PayMongo account or mode) or an id mismatch are permanent, so the webhook logs an error (`session_not_found` or `session_mismatch`) and answers `200` so PayMongo stops retrying, writing nothing.
- **AC-7**: On a verified paid event for a known session, with the payment read from the fetched session (AC-6b), when the paid amount (in centavos) equals the order's `totalAmount` and the currency equals the order's currency, the order gets `paymentStatus` `PAID`, `status` `PENDING`, and the payment id, channel, `paidAt` and `paidAmount` are stored. The webhook answers `200` before the OMS send starts.
- **AC-8**: After the webhook has answered (scheduled with `after()`, not in the same step), the order is sent to the OMS with `paymentMethod: "prepaid"`, its `shippingFee`, and `payment: { amount, currency, provider: "paymongo", channel, reference, paidAt }`. On success `omsCustomerId`, `omsOrderId` and `sentToOmsAt` are always saved, and the order becomes `CONFIRMED` if it is still `PENDING` (an OMS status webhook may already have moved it), with no admin action.
- **AC-9**: A repeated paid event for the same session records the payment once. If the order is already sent, nothing happens. If it is paid but not yet sent, the send is tried again.
- **AC-10**: When the send fails for a reason that may pass (network error, timeout, OMS `401`, `5xx`, `customer_not_found`), the order stays `PENDING` and `PAID`, `omsSendError` holds the plain message, and the admin order page shows "Paid, not sent to OMS" with a Send to OMS button. That button (the existing confirm route) retries with a byte identical request.
- **AC-11**: When the OMS refuses the paid order for good (`amount_mismatch`, `currency_mismatch`, `price_unknown`, `unknown_sku`, `product_inactive`, `no_physical_items`, `mixed_currency`, `validation_error`, `idempotency_conflict`, `payment_reference_used`), or when the verified paid amount or currency does not match the order (AC-7), the order gets `paymentStatus` `REFUND_NEEDED`, `omsSendError` holds the plain message, and admins get a "refund needed" email. No OMS order exists for it. The four codes new to paid orders (`amount_mismatch`, `currency_mismatch`, `price_unknown`, `payment_reference_used`) get their own plain sentences in `ERROR_MESSAGES`, so staff never see the generic fallback for them.
- **AC-11b**: When the OMS status webhook moves a `PREPAID` order whose `paymentStatus` is `PAID` to `CANCELLED` (OMS `CANCELLED` or `REJECTED`), the same write sets `paymentStatus` to `REFUND_NEEDED`, and admins get the "refund needed" email. The money is never left stranded on a cancelled order.
- **AC-12**: On an order that is `REFUND_NEEDED`, or `PAID` and not yet sent, an admin's Refund button calls PayMongo's refund API for the full `paidAmount`. On success the order gets `paymentStatus` `REFUNDED`, `refundId`, `refundedAt` and `status` `CANCELLED`. A second click on an order already `REFUNDED` answers `409` without calling PayMongo (the route rereads the state first, and PayMongo also refuses a refund above the paid amount). If PayMongo refuses (for example, a channel it can't refund by API), the admin sees PayMongo's plain reason and a "Mark refunded manually" action that takes a required note. That action reaches the same end state with `refundId` null and the note added to `adminNotes`.
- **AC-13**: An `AWAITING_PAYMENT` order whose `paymentExpiresAt` has passed becomes `CANCELLED` with `paymentStatus` `EXPIRED` at the next read that touches it (expiry is lazy, not on a timer): the admin orders list sweeps up to 5 stale orders per load (AC-13b; 20 before that update), while the checkout status endpoint and checkout submit only ever expire the one order tied to their own `checkoutKey`. Its PayMongo session is expired as well (best effort, a failure is only logged). No OMS order is created.
- **AC-13b**: Before any expiry (the 60 minute sweep in AC-13, and the cancel link in AC-15), the order's PayMongo session is checked. The check runs only for an order that is `AWAITING_PAYMENT` / `UNPAID` and has a stored session id; anything else is a no op, and an order with no session id (AC-4) expires with no check.
  1. **Lease first.** A conditional write moves the order's `paymentExpiresAt` 2 minutes later (`where id and status AWAITING_PAYMENT and paymentExpiresAt = the value just read`). If it changes nothing, another sweep or poll holds the order: skip it. This also means a deferred order is checked again at most every 2 minutes.
  2. **Fetch** `GET /v1/checkout_sessions/{id}` and read it exactly as the webhook does (AC-6b).
  3. **Paid** (a payment is attached): `markPaid` runs inline, with its amount check (a mismatch becomes `REFUND_NEEDED`, AC-7/AC-11); the admin email and OMS send (`settlePaid`) run in `after()`. Log `rescued_paid`. A `duplicate` result from `markPaid` (the webhook got there first) does nothing more: the webhook, AC-9 and the admin button own the retry.
  4. **Defer** (leave `AWAITING_PAYMENT`, log `expire_deferred`) when PayMongo can't be reached (network error, timeout, `5xx`), or when no payment is attached yet but the session's `payment_intent.attributes.status` is `succeeded` or `processing` (the same attach delay AC-6b exists for).
  5. **Expire** otherwise (no payment and the intent not succeeding, a PayMongo `404` or other `4xx`, or a fetched id different from the stored one). First expire the PayMongo session (`POST …/expire`); if PayMongo refuses because the session is already paid, defer instead (step 4). Then write `CANCELLED` / `EXPIRED` with the usual conditional write.

  Where it runs: the admin orders `GET` sweeps at most 5 stale orders per load inside `after()` (the list answers first; the route sets `maxDuration = 60`). The status endpoint, the cancel endpoint and checkout submit check only their own order, inline, and set `maxDuration = 30`.
- **AC-14**: A paid event that arrives for an `EXPIRED` order is still honored: it is recorded and sent exactly as in AC-7 to AC-11.
- **AC-15**: When the customer leaves PayMongo through its cancel link, `/checkout` calls the cancel endpoint, which runs the AC-13b check at once (no 60 minute wait). Only when the answer is `expired` does `/checkout` show "Payment cancelled. Your cart is still here." with the cart intact and start a new `checkoutKey` for the next Place order. When the answer is `paid`, `refund_needed` or `awaiting_payment` (rescued or deferred), the browser goes to `/checkout/done?key=…` instead, keeping the key, so a customer who did pay can never be charged a second time.
- **AC-16**: The return page `/checkout/done?key=<checkoutKey>` shows "Confirming your payment…" and polls the status endpoint every 2 seconds for up to 60 seconds. Paid (sent or not) shows the order number, the total and "Paid", and clears the cart. Expired shows "Payment not completed" with a link back to `/checkout`. Refund needed shows "We received your payment but couldn't place your order. Our team will contact you about your refund." Refunded shows "Your payment was refunded. Our team has been in touch about your order." Still awaiting after 60 seconds shows "Still confirming your payment. We'll message you at the mobile number you gave us." The status endpoint returns no name, phone, email or address.
- **AC-17**: On the admin orders pages, an `AWAITING_PAYMENT` order shows "Awaiting payment" and no Confirm button, and `PATCH /api/orders/[id]` refuses any status change on it (`409`, "This order is waiting for online payment. Its status changes on its own."). A `PAID` order cannot be set to `CANCELLED` by `PATCH` (`409`, "Refund this order instead"). Both messages differ from the existing OMS lock message, so staff can tell which lock applies. The order detail shows payment method, payment status, channel, reference, paid at, paid amount, any `omsSendError`, and refund id or manual refund note.
- **AC-18**: For an online order, the admin "new order" email goes out when it is paid (AC-7), not when it is placed, and reads "Paid online (<channel>)". The "refund needed" email goes out on AC-11 and AC-11b. An email failure never fails the webhook or the send.
- **AC-19**: `POST /api/orders/[id]/confirm` on a `PREPAID` storefront order whose `paymentStatus` is not `PAID` answers `409`, "This order hasn't been paid yet." For a `PAID` order it builds the `payment` object only from stored columns.
- **AC-20**: No card number, CVV or wallet credential is ever received, stored or logged. Payment logs carry only the order number and an outcome code, never a request or response body.

## Decision

**Chosen option**: PayMongo hosted Checkout Session, order saved before the redirect, paid only from PayMongo's own answer (signed webhook, or our API check before expiry), then sent to the OMS in the same flow.

The storefront saves an `AWAITING_PAYMENT` order, sends the customer to a PayMongo Checkout Session, marks the order paid only from a payment PayMongo's API returns for its session (after a verified `checkout_session.payment.paid` webhook, or when checking before expiry), and then sends it to the OMS with its payment record using the existing `sendOrderToOms`. Failures fall back to the admin page (retry or refund), with no cron and no new tables.

**Decisions made in this spec** (each with its runner up; full reasoning in [rationale.md](rationale.md)):
- **Provider**: PayMongo. Runner up: Xendit.
- **Payment entry**: PayMongo's hosted checkout page (the lightest PCI level, SAQ A). Runner up: embedded fields.
- **Channels**: `card`, `gcash`, `paymaya`, `grab_pay`, `qrph`, `dob` (online banking). MariBank and GoTyme are reached through QR Ph, since PayMongo has no dedicated button for either. BillEase and other pay later options are left out.
- **Order timing**: saved as `AWAITING_PAYMENT` before the redirect. Runner up: created only after payment.
- **Status model**: new `OrderStatus.AWAITING_PAYMENT` plus a new `paymentStatus` field. Runner up: `paymentStatus` only.
- **Payment storage**: columns on `Order`. Runner up: a `Payment` table.
- **Handled once**: conditional updates plus a unique payment id, no event table. Runner up: a `PaymentEvent` log.
- **Abandonment**: 60 minutes, applied lazily when an order is read (no cron), after asking PayMongo whether the session was paid (AC-13b): paid orders are rescued, and an unreachable PayMongo defers the expiry. The PayMongo session is expired before the order is. Runner up: a scheduled sweep.
- **Late payment**: honored and sent. Runner up: always refund.
- **OMS refusal**: flagged `REFUND_NEEDED`, with a one click refund by staff. Runner up: automatic refund.
- **Send retry**: a repeated webhook, or the admin Send to OMS button. Runner up: a scheduled retry job.
- **Send timing**: `after()` from `next/server` (runs once the response is sent), so PayMongo gets its `200` quickly. Runner up: send inline before answering.
- **Webhook replay window**: no timestamp window, because every write is idempotent. Runner up: a 5 minute window like `/api/oms/webhook`.
- **Return page**: polls a status endpoint. Runner up: a static message.
- **Return URLs**: built from `NEXTAUTH_URL` (already the site's public base URL). Runner up: the request origin.
- **Billing prefill**: the customer's name, email and phone go to PayMongo as billing details (helps 3DS and fraud checks). PayMongo's own email receipt is off, since order emails are 7.6's job.

## Feature design

**Data model sketch** (additive only; the dev database is production):

| Entity | Field | Type | Null | Notes |
|---|---|---|---|---|
| `OrderStatus` enum | `AWAITING_PAYMENT` | new value | | online order saved, not yet paid; Confirm and `PATCH` refuse it |
| `PaymentStatus` enum (new) | `UNPAID`, `PAID`, `REFUND_NEEDED`, `REFUNDED`, `EXPIRED` | | | the money side, separate from fulfilment status |
| `Order` | `paymentStatus` | `PaymentStatus` | nullable | null for COD and admin orders |
| `Order` | `paymentExpiresAt` | `DateTime` | nullable | `createdAt` plus 60 min for online orders |
| `Order` | `paymongoCheckoutId` | `String` | nullable, `@unique` | `cs_…`; the webhook finds the order by this |
| `Order` | `paymongoCheckoutUrl` | `String` | nullable | replayed on a repeat submit (AC-5) |
| `Order` | `paymongoPaymentId` | `String` | nullable, `@unique` | `pay_…`; sent to the OMS as `payment.reference` |
| `Order` | `paymentChannel` | `String` | nullable | lowercase, OMS pattern `^[a-z0-9_]{1,40}$` (`card`, `gcash`, `maya`, `grab_pay`, `qrph`, `dob`) |
| `Order` | `paidAt` | `DateTime` | nullable | from PayMongo's `paid_at` |
| `Order` | `paidAmount` | `Decimal(10,2)` | nullable | what PayMongo says was paid |
| `Order` | `omsSendError` | `String` | nullable | last plain send failure; cleared on success |
| `Order` | `refundId` | `String` | nullable | `ref_…`; null after a manual refund |
| `Order` | `refundedAt` | `DateTime` | nullable | |

Index: `@@index([status, paymentExpiresAt])` for the lazy expiry query. No new tables. `Order` still has no relationship to anything new: each order has at most one payment (1:1, held in its own columns).

**State transitions** (online orders only; COD is unchanged):

| From (status / paymentStatus) | Event | To | Who |
|---|---|---|---|
| (none) | Place order, online | `AWAITING_PAYMENT` / `UNPAID` | checkout route |
| `AWAITING_PAYMENT` / `UNPAID` | session create fails | `CANCELLED` / `EXPIRED` | checkout route |
| `AWAITING_PAYMENT` / `UNPAID` | past 60 min at the next read (lazy), or customer cancelled, and PayMongo shows no payment (AC-13b) | `CANCELLED` / `EXPIRED` | lazy expiry, cancel endpoint |
| `AWAITING_PAYMENT` / `UNPAID` | same, but PayMongo shows a payment for the session | `PENDING` / `PAID` (then the send, as the webhook does) | lazy expiry, cancel endpoint (AC-13b) |
| `AWAITING_PAYMENT` / `UNPAID` | same, but PayMongo can't be reached | unchanged, checked again at the next read | lazy expiry, cancel endpoint (AC-13b) |
| `AWAITING_PAYMENT` or `CANCELLED` / `UNPAID` or `EXPIRED` | verified paid event, amounts match | `PENDING` / `PAID` | PayMongo webhook |
| same | verified paid event, amounts differ | `PENDING` / `REFUND_NEEDED` | PayMongo webhook |
| `PENDING` (or already `CONFIRMED` by an OMS webhook) / `PAID` | OMS accepts | `CONFIRMED` / `PAID`, OMS ids saved | automatic send, or admin Send to OMS |
| `PENDING` / `PAID` | OMS failure that may pass | unchanged, `omsSendError` set | automatic send |
| `PENDING` / `PAID` | OMS refuses for good | `PENDING` / `REFUND_NEEDED` | automatic send, or admin Send to OMS |
| `PENDING` / `REFUND_NEEDED` or `PAID` | refund succeeds or is marked manual | `CANCELLED` / `REFUNDED` | admin |
| `CONFIRMED` onward / `PAID` | OMS webhook `CANCELLED` or `REJECTED` | `CANCELLED` / `REFUND_NEEDED` | OMS webhook (AC-11b) |
| `CONFIRMED` onward | any other OMS webhook | as today (VS-242) | OMS |

The paid transition is one conditional write: `where paymongoCheckoutId = id and paymongoPaymentId is null`. The send's success is two writes, because the OMS webhook (which finds orders by `orderNumber` and sets `status` with a compare and set on `omsLastEventAt`) can land between the OMS reply and ours. First, `where id and omsOrderId is null` saves the OMS ids and `sentToOmsAt`. Then, `where id and status = PENDING` sets `CONFIRMED`. A webhook that got there first simply leaves the second write with nothing to do, and the ids are never lost. Expiry is `where status = AWAITING_PAYMENT and paymentStatus = UNPAID`. Whichever runs first wins, and the others change nothing.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/checkout` (changed) | POST | spec 0003 body, plus `paymentMethod: "cod" \| "online"` | COD: as today. Online: `201 { orderNumber, total, checkoutUrl }` | public, `checkoutKey` + IP rate limit | `400`, `409 cart_changed / price_changed / online_unavailable`, `422 prescription_required`, `429`, `502` |
| `/api/checkout/status` (new) | GET | `key` (the `checkoutKey`, a UUID) | `{ orderNumber, total, state: "awaiting_payment" \| "paid" \| "expired" \| "refund_needed" \| "refunded" }` | the key itself (unguessable) | `400` bad key, `404` unknown key |
| `/api/checkout/cancel` (new) | POST | `{ key }` | `{ state }` | the key | `400`, `404` |
| `/api/paymongo/webhook` (new) | POST | raw body, `Paymongo-Signature` header | `200 { received: true }` | HMAC signature | `401` bad signature, `400` bad JSON or no session id, `503` payment not attached yet or PayMongo unreachable or `5xx`, `500` database failure (both make PayMongo retry); a PayMongo `4xx` for the session or an id mismatch is logged and answered `200` (retrying can't fix it) |
| `/api/orders/[id]/confirm` (changed) | POST | as today | as today | admin | adds `409` "This order hasn't been paid yet" |
| `/api/orders/[id]/refund` (new) | POST | `{ manual?: true, note?: string }` (note required when manual, 1 to 500 chars) | updated order | admin | `409` wrong state, `422` PayMongo refused (plain reason), `400` missing note |
| `/api/orders/[id]` (changed) | PATCH | as today | as today | admin | adds `409` for status changes on `AWAITING_PAYMENT`, and `CANCELLED` on a `PAID` order |

PayMongo calls (all from the server, Basic auth with `PAYMONGO_SECRET_KEY` as the username and an empty password, 10 s timeout, in `src/lib/paymongo.ts`):
- `POST https://api.paymongo.com/v1/checkout_sessions`: `line_items` (name, `amount` = the UNIT price in integer centavos, `currency: "PHP"`, `quantity` = the line qty; PayMongo multiplies them), `payment_method_types` (the channel list above), `reference_number: orderNumber`, `success_url`, `cancel_url`, `billing { name, email, phone }`, `send_email_receipt: false`, `description: "VitalStats order <orderNumber>"`. Reads back `id` and `attributes.checkout_url`.
- `GET /v1/checkout_sessions/{id}`: the source of the payment for a paid event (AC-6b). Reads `data.attributes.payments[0]`, or `data.attributes.payment_intent.attributes.payments[0]` when the first list is empty. `getCheckoutSession` reports whether a failure is permanent (a `4xx`) or temporary (network, timeout, `5xx`), so the webhook can choose `200` or `503`. Same 10 s cap as the other calls. PayMongo's own webhook wait is not documented in what was checked; if it runs out while we fetch, PayMongo simply delivers again, and every write is idempotent, so a slow fetch delays a payment but never duplicates or loses it.
- `POST /v1/checkout_sessions/{id}/expire`: best effort on expiry and cancel.
- `POST /v1/refunds`: `{ amount (centavos), payment_id, reason: "others", notes: orderNumber }`. Reads back `id`.
- Webhook signature: the header is `t=<timestamp>,te=<test signature>,li=<live signature>`. Compute HMAC SHA256 of `<t>.<raw body>` with `PAYMONGO_WEBHOOK_SECRET`. Compare with timing safe equality against `li` when the secret key starts with `sk_live_`, else against `te`.
- Paid event: `data.attributes.type === "checkout_session.payment.paid"`. The event is used only for the session id, `data.attributes.data.id` (`cs_…`); its `payments` and `payment_intent.attributes.payments` lists arrive empty (confirmed on real test payments). The payment comes from the fetched session (above): its `id` (`pay_…`), `attributes.amount` in centavos, `attributes.currency`, `attributes.paid_at` in unix seconds. Channel: read the payment's `attributes.source.type` first, and fall back to the session's `payment_method_used` only when that is missing. If neither yields a value matching `^[a-z0-9_]{1,40}$` after mapping, store `unknown`, so the OMS pattern always holds.
- Code: `paidEventSessionId(body)` reads the id from the event, `getCheckoutSession(id)` fetches it, `parsePaidSession(data)` reads the payment and names the first missing field, which is safe to log (never the values).
- Money conversions go only through the existing `toCentavos` / `formatCentavos` helpers in `src/lib/cart-quote.ts` (never `parseFloat` or `Number(x) * 100`), for line items, the webhook's paid amount and the refund amount.

These PayMongo shapes were checked against PayMongo's docs and two real test mode card payments (VS-255, 2026-09-27). One difference from the docs: the paid event carries no payment record, hence AC-6b.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Checkout, online | line item `amount` per product | `toCentavos(quote.lines[].unitPrice)` (fresh OMS unit price), with `quantity` = `quote.lines[].qty` |
| Checkout, online | "Delivery fee" line item | `deliveryFeeCentavos(province)` (spec 0003) |
| Checkout, online | session total | the sum of `amount × quantity` over the line items, which must equal `check.totalCentavos` (checked in code before the call; a mismatch is the `502` path) |
| Checkout, online | `paymentExpiresAt` | server `now` plus 60 min (constant `PAYMENT_WINDOW_MS`) |
| Checkout, online | `success_url` | `${NEXTAUTH_URL}/checkout/done?key=<checkoutKey>` |
| Checkout, online | `cancel_url` | `${NEXTAUTH_URL}/checkout?cancelled=<checkoutKey>` |
| Checkout, online | billing name, email | the checkout input (`name`, `email`) |
| Checkout, online | billing phone | the normalized `phone` without its `+63` (10 digits): PayMongo's page adds its own `+63`, and a doubled one blocks its Pay button |
| Checkout replay | `checkoutUrl` | `Order.paymongoCheckoutUrl` |
| Expiry check | which session | `Order.paymongoCheckoutId` (no check when it is null) |
| Expiry check | whether it was paid, and the payment record | the same `GET /v1/checkout_sessions/{id}` read as the webhook (`getCheckoutSession`, `parsePaidSession`) |
| Webhook | which session | the verified event's `data.attributes.data.id` |
| Webhook | which order | `Order.paymongoCheckoutId` = that session id (never metadata, never the reference number alone) |
| Webhook | the payment record | `GET /v1/checkout_sessions/{id}`: `payments[0]`, else `payment_intent.attributes.payments[0]` (never the event body, which has none) |
| Webhook | `paymongoPaymentId` | the fetched payment's `id` |
| Webhook | `paidAmount` | `formatCentavos(fetched payment attributes.amount)` |
| Webhook | `paymentChannel` | the fetched payment's `source.type`, else the fetched session's `payment_method_used`, lowercased, with `paymaya` mapped to `maya`, else `unknown` |
| Webhook | `paidAt` | the fetched payment's `attributes.paid_at` (unix seconds) as a `DateTime` |
| OMS send | `payment.amount` | `Order.paidAmount.toFixed(2)` |
| OMS send | `payment.currency` | `Order.currency` |
| OMS send | `payment.provider` | constant `"paymongo"` |
| OMS send | `payment.channel` | `Order.paymentChannel` |
| OMS send | `payment.reference` | `Order.paymongoPaymentId` |
| OMS send | `payment.paidAt` | `Order.paidAt.toISOString()` (stable across retries, so the Idempotency-Key body never changes) |
| OMS send | `shippingFee` | `Order.shippingFee.toFixed(2)` (as today) |
| OMS send | failure kind | new `retryable` flag on the `OmsResult` failure, derived from HTTP status and OMS error code (AC-10 vs AC-11 lists) |
| Status endpoint | `state` | derived from `paymentStatus`: `UNPAID` → `awaiting_payment`; `PAID` → `paid`; `REFUND_NEEDED` → `refund_needed`; `REFUNDED` → `refunded`; `EXPIRED` → `expired` |
| Refund | refund `amount` | `toCentavos(Order.paidAmount.toFixed(2))` |
| OMS send failure text | `omsSendError` | `ERROR_MESSAGES` in `oms.ts`, extended with the four paid order codes |
| Admin email, paid | channel label | `Order.paymentChannel` |
| Checkout page | whether "Card or e wallet" is enabled | server page reads `PAYMONGO_SECRET_KEY`, `OMS_BASE_URL`, `OMS_API_KEY` and passes a boolean to `CheckoutView` |

**Key invariants**:
- An order reaches the OMS as `prepaid` only when `paymentStatus` is `PAID`. `AWAITING_PAYMENT` can never be confirmed.
- `paymentStatus` becomes `PAID` only from a payment PayMongo's API returns for the order's stored session id (fetched `id` equal to it), in the verified webhook handler or the check before expiry. A browser request can at most trigger that check; it can never supply payment details, and the webhook event body is never trusted for them.
- An order that PayMongo shows as paid, or whose payment may still be attaching, is never written `EXPIRED` (AC-13b).
- At most one expiry check runs per order at a time (the 2 minute lease on `paymentExpiresAt`).
- A PayMongo payment id belongs to one order (`@unique`). A session id belongs to one order (`@unique`).
- The PayMongo session total equals `Order.totalAmount` to the centavo, and the OMS `payment.amount` equals `Order.paidAmount`. If PayMongo's paid amount differs from `totalAmount`, the order goes to `REFUND_NEEDED`, never to the OMS.
- The OMS request body for an order is built only from stored columns, so every retry is byte identical (the OMS Idempotency-Key rule).
- A COD order's OMS request bytes do not change (`payment` is only added when present).
- Once the OMS accepted an order, its `omsOrderId` is always saved, whatever the OMS webhook did to `status` in the meantime.
- A `PREPAID` order never ends `CANCELLED` with `paymentStatus` `PAID`: it is either `REFUND_NEEDED` or `REFUNDED`.
- In the browser, only `/checkout/done` (on a paid state) clears the cart and the stored `checkoutKey`. Only a cancel return makes a new key. The online submit never does either.

**Security model**:
- Compliance: PCI DSS at SAQ A (all card and wallet entry happens on PayMongo's page, and we never receive card data), plus RA 10173 (the Philippine Data Privacy Act) for the name, email and phone we pass to PayMongo as billing details. PayMongo becomes a personal information processor, so the privacy notice must name it (Follow-up).
- Public: `POST /api/checkout` (as today), `GET /api/checkout/status` and `POST /api/checkout/cancel`, both keyed by the unguessable `checkoutKey`, returning no personal data. Cancel can only expire an unpaid order after checking PayMongo, or mark it paid from PayMongo's own answer (AC-13b), so a replay can change nothing PayMongo doesn't confirm.
- PayMongo only: `/api/paymongo/webhook`, authenticated by HMAC. It is not under `/admin`, so the auth middleware doesn't touch it.
- Admin only (`requireAdminSession`): confirm, refund, `PATCH`.
- Secrets live only on the server: `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` are never `NEXT_PUBLIC_`. No public key is needed with a hosted checkout.
- Audit trail: each payment state change is on the order row (`paidAt`, `refundedAt`, `refundId`, `adminNotes` for manual refunds), plus a structured log line `{ event: "payment", orderNumber, outcome }`. No bodies are logged (AC-20).

**Configuration required**:
- `PAYMONGO_SECRET_KEY`: server secret key (`sk_test_…` locally and in test, `sk_live_…` in production). Also picks which signature (`te` or `li`) the webhook checks.
- `PAYMONGO_WEBHOOK_SECRET`: the signing secret PayMongo returns when the webhook is registered (`whsk_…`).
- One time setup: register a PayMongo webhook for `https://<site>/api/paymongo/webhook` with the event `checkout_session.payment.paid`, in the PayMongo dashboard or through its API, once for test mode and once for live.
- `NEXTAUTH_URL` (existing) must be the public site URL, because it builds the return links.
- The webhook route sets `export const maxDuration = 30` so the two OMS calls (10 s each) can finish inside `after()`.

**Critical test scenarios** (node:test beside the source, OMS and PayMongo faked with `fetchFn`, database faked as in the existing route tests):
- Happy path: online submit → session created with line items adding up to the total → signed paid event → order `PAID` → OMS gets `prepaid` with the exact `payment` object → `CONFIRMED`. Verifies **AC-2**, **AC-7**, **AC-8**
- Line items: a two product Metro Manila cart with one line at qty 3 gives unit price line items (qty 3) plus a ₱100.00 delivery fee line, and `Σ amount × quantity` equals `totalAmount`. Verifies **AC-2**
- Unchecked quote → `409 online_unavailable`, no order saved. Verifies **AC-3**
- The OMS webhook sets `CONFIRMED` between the OMS reply and our write: the ids are still saved, and the status stays `CONFIRMED`. Verifies **AC-8**
- The OMS webhook cancels a paid prepaid order → `CANCELLED/REFUND_NEEDED` plus an email. Verifies **AC-11b**
- `CheckoutView` online submit redirects and keeps the cart and key; `/checkout/done` on paid clears both. Verifies **AC-2**, **AC-5**, **AC-16**
- PayMongo create fails → order `CANCELLED/EXPIRED`, `502`. Verifies **AC-4**
- Repeat submit with the same key returns the same URL, and PayMongo is called once. Verifies **AC-5**
- Bad signature, missing header, or a `te` signature checked against a live key → `401`, nothing written. Verifies **AC-6**
- Event with empty payment lists (the real shape): the payment is read from the fetched session; fetched session with no payment yet, or PayMongo unreachable → `503`, nothing written, then the retry records it; PayMongo `404` for the session, or a fetched session whose id differs from the event's → `200`, an error log, nothing written. Verifies **AC-6b**, **AC-7**
- The same paid event twice → one payment recorded; the second retries the send only when it's unsent. Verifies **AC-9**
- OMS `503` → stays `PAID` with `omsSendError`; admin confirm then succeeds with an identical body. Verifies **AC-10**, **AC-19**
- OMS `422 amount_mismatch`, and a paid amount that differs from the total → `REFUND_NEEDED` and a refund email. Verifies **AC-11**, **AC-18**
- Refund succeeds → `REFUNDED/CANCELLED`; PayMongo refuses → `422` with its reason, then a manual refund with a note works. Verifies **AC-12**
- Expired order: the status call expires it and calls the session expire; a later paid event is still honored. Verifies **AC-13**, **AC-14**
- Cancel endpoint expires an `UNPAID` order and ignores a `PAID` one. Verifies **AC-15**
- Expiry check (AC-13b): a stale order whose session PayMongo shows as paid becomes `PAID`, sent in `after()`; no payment attached but intent `succeeded` → deferred; PayMongo unreachable → deferred; no payment and intent not succeeding, or `404` → PayMongo session expired first, then `EXPIRED`; PayMongo refuses the session expire as already paid → deferred; the webhook winning the race → no second send; two sweeps at once → the lease lets one check; the cancel link returning `paid` or `awaiting_payment` → `/checkout/done`; a replay past the window → `paymentState`, no dead link; the admin list answers before its sweep runs. Verifies **AC-5**, **AC-13b**, **AC-15**
- Status endpoint output holds no name, phone, email or address. Verifies **AC-16**
- `PATCH` on `AWAITING_PAYMENT`, and `CANCELLED` on a `PAID` order → `409`; confirm on an unpaid prepaid order → `409`. Verifies **AC-17**, **AC-19**
- A COD order's OMS body is byte identical to before this change. Verifies **AC-1**, **AC-8**

## Build plan

No build approach is recorded in `AGENTS.md`, so this assumes Tracer Bullet slices (a thin working thread end to end first, then thicker). Each slice ends runnable against PayMongo test mode and the real OMS.

**Slice 1: one paid order reaches the OMS (the thread)**
1. [x] Migration: `AWAITING_PAYMENT`, the `PaymentStatus` enum, the new `Order` columns and the index (all additive and nullable). Satisfies **AC-2**, **AC-7**
2. [x] `src/lib/paymongo.ts`: `createCheckoutSession`, `verifySignature`, `parsePaidEvent` (channel mapping; replaced by `paidEventSessionId` and `parsePaidSession` in 6b), all taking `fetchFn` for tests like `oms.ts` does. Add `paymongo.test.ts` to the `test` script. Satisfies **AC-2**, **AC-6**, **AC-20**
3. [x] `src/lib/oms.ts`: optional `payment` on `OmsOrderInput` (sent only when present), `retryable` on the failure result, and `ERROR_MESSAGES` entries for `amount_mismatch`, `currency_mismatch`, `price_unknown` and `payment_reference_used`. Extend `oms.test.ts`, including the COD bytes unchanged case. Satisfies **AC-8**, **AC-10**, **AC-11**
4. [x] `src/lib/paid-order.ts`: `markPaid(event)` (the conditional write, the amount check) and `sendPaidOrder(orderId)` (builds the input from columns, then applies the success transition as the two writes described under State transitions, or the retryable or hard refusal transition). Add a test file, including the webhook first race. Satisfies **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**
5. [x] `parseCheckout` accepts `"online"`. `/api/checkout` gets the online branch: the `online_unavailable` checks, save `AWAITING_PAYMENT`, create the session, store the id and URL, the replay of a stored URL, and the `502` fallback. No admin email at placement for online orders. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
6. [x] `/api/paymongo/webhook`: raw body, signature, event filter, `markPaid`, `200`, then `after(() => sendPaidOrder(id))`, with `maxDuration = 30`. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**
6b. [x] Webhook reads the payment from `GET /v1/checkout_sessions/{id}` (`paidEventSessionId`, `getCheckoutSession`, `parsePaidSession`), `503` when not attached yet or unreachable; billing phone sent without `+63`. Found on the first real test payment. Satisfies **AC-6b**, **AC-7**
6c. [x] From the cross check: `getCheckoutSession` marks a `4xx` as permanent; the webhook answers `200` with an error log (`session_not_found`) for it, and for a fetched session id that differs from the event's (`session_mismatch`), keeping `503` for network, timeout and `5xx`. Add route tests for the `404` and the mismatch. Satisfies **AC-6b**
7. [x] `CheckoutView`: enable "Card or e wallet" (the server page passes the enabled flag). Split the submit success branch: when the reply has `checkoutUrl`, set `window.location.href` to it and do NOT call `clearCart()`, remove the stored key or show `<Confirmation>` (today's branch does all three for any `201`). COD keeps today's branch. Minimal `/checkout/done` page (it clears the cart and the key on paid) plus `/api/checkout/status`. Satisfies **AC-1**, **AC-16**

**Slice 2: failures are visible and recoverable**
8. [x] Confirm route: refuse unpaid prepaid orders; for `PAID` orders, delegate to `sendPaidOrder` so the body is identical. Admin order page: payment section, "Paid, not sent to OMS" with Send to OMS. Satisfies **AC-10**, **AC-17**, **AC-19**
9. [x] `paymongo.ts` `createRefund`, plus `/api/orders/[id]/refund` (API and manual modes) and the Refund / Mark refunded manually buttons. Satisfies **AC-11**, **AC-12**
10. [x] `notifyAdmin`: online order paid (with channel) and a new `refund_needed` kind, sent from `markPaid` / `sendPaidOrder`, with errors swallowed and logged by code. Satisfies **AC-11**, **AC-18**
11. [x] `PATCH /api/orders/[id]` guards for `AWAITING_PAYMENT` and cancelling a `PAID` order; the "Awaiting payment" badge, with no Confirm button. Satisfies **AC-17**
11b. [x] `/api/oms/webhook`: when the mapped status is `CANCELLED` on a `PREPAID` order with `paymentStatus` `PAID`, set `REFUND_NEEDED` in the same transaction, and send the refund email after it commits. Satisfies **AC-11b**, **AC-18**

**Slice 3: abandonment, cancel, late payment, polish**
12. [x] `expirePayments({ checkoutKey? })` in `paid-order.ts` (the conditional update, then best effort `expireCheckoutSession`). The admin orders `GET` calls it with no key (sweeps at most 20). The status endpoint and checkout submit pass their own key, so they only ever expire that one order. Satisfies **AC-13**, **AC-14**
13. [x] `/api/checkout/cancel`, and the `?cancelled=` handling on `/checkout` (message, keep cart, new `checkoutKey`). Satisfies **AC-15**
13b. [x] AC-13b in `paid-order.ts` (after 6c's permanent vs temporary split): the gate, the 2 minute lease on `paymentExpiresAt`, the fetch, rescue via `markPaid` (duplicate is a no op) with `settlePaid` in `after()`, the defer rules (unreachable, intent `succeeded`/`processing`), PayMongo session expire before the `EXPIRED` write (already paid → defer). Admin orders `GET`: sweep of 5 inside `after()`, `maxDuration = 60`. Status, cancel and checkout: own order only, `maxDuration = 30`. `CheckoutView`: cancel answer other than `expired` goes to `/checkout/done` keeping the key. Checkout replay past `paymentExpiresAt` returns `paymentState`, not the URL (AC-5). Fix the stale comments ("Only the verified webhook calls this" in `markPaid`, "Reading it never marks anything paid" in the status route). Route tests for each outcome. Satisfies **AC-5**, **AC-13b**, **AC-15**
14. [x] `/checkout/done` full states: polling, the 60 s cap, clearing the cart on paid, and the refund needed, refunded and still confirming copy. Satisfies **AC-16**
15. [x] `.env.example`: `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`. Register the test mode webhook and run one real test mode payment per channel family (card, GCash, QR Ph). Satisfies **AC-1**, **AC-6**, **AC-20** (Done 2026-09-27: webhook registered through a tunnel; real test payments VS-260927-ZSHZ8 card, VS-260927-PVNVF gcash, VS-260927-YFSMR qrph all paid and sent to the OMS on their own; VS-260927-QZB5H paid with the webhook cut off was rescued through the cancel link, AC-13b.)

## Consequences

**Positive**:
- Paid customers reach fulfilment with no staff step, and COD stays exactly as it is.
- Card data never touches VitalStats, so PCI stays at the lightest level (SAQ A).
- No new tables, no cron and no queue: the state lives on `Order`, and recovery is the admin page staff already use.
- The OMS stays the judge of price. A mismatch can never become a shipped order at the wrong price.

**Negative / tradeoffs**:
- The OMS reserves no stock between charge and send, so a product can sell out in between. That customer is charged, then refunded (AC-11). Rare at this volume, but real money moves twice.
- Each expiry now costs one or two PayMongo calls (fetch, then session expire), and during a PayMongo outage abandoned orders stay "Awaiting payment", rechecked at most every 2 minutes, until a check succeeds (AC-13b). That is the price of never cancelling an order the customer actually paid for. The admin sweep checks only 5 orders per load, so a large backlog clears over several loads.
- Expiry is lazy. If nobody opens the admin list or the checkout, an abandoned order stays `AWAITING_PAYMENT` past 60 minutes in the database. It is harmless (it can't be confirmed, and a late payment is honored), but the list can show stale "Awaiting payment" rows until the next read.
- The send runs in `after()`. If the server instance dies mid send, the order stays "Paid, not sent" until PayMongo repeats the webhook or staff click Send to OMS. There is no automatic sweep.
- Refunds for QR Ph and online banking may not be possible through PayMongo's API, so staff do those by hand and record them with a note.
- PayMongo fees apply per transaction (percent plus fixed, varying by channel), which COD doesn't have.
- Audit logs are not optional here: every payment state change must stay traceable through the order columns and the `payment` log lines. Dropping them is not a valid simplification.

**Neutral**:
- Two new env vars, plus a one time webhook registration per mode (test and live).
- Every paid event costs one extra PayMongo API call (the session fetch), and marking an order paid now also needs PayMongo's API to be up. When it isn't, the `503` makes PayMongo retry, so a payment is delayed, never lost.
- The migration adds enum values and nullable columns only, so it's safe on the production database.

## Follow-up

- [ ] Update the privacy notice (spec 0001, `src/lib/legal.ts`) to name PayMongo as a processor of name, email and phone for online payments, and bump `PRIVACY_VERSION`. This must land before live keys are used.
- [ ] Complete PayMongo business onboarding (KYC) and confirm which channels are enabled on the account (QR Ph, GrabPay and online banking can need separate activation).
- [ ] Confirm with PayMongo which channels can be refunded through the API, and note the manual refund process for the rest.
- [ ] `/sync`: add `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` to the environment list in `CLAUDE.md`, and a `src/lib/paymongo.ts` note to `AGENTS.md` (the webhook is the only source of "paid").
- [ ] Order emails to the customer (7.6) can hook into `markPaid` for a "payment received" message.
- [ ] The existing COD confirm route has the same latent race as S2 in the cross check (it saves the OMS ids only `where status = PENDING`, so an OMS webhook that lands first loses them). Apply the same two write fix there, as its own small ticket.
- [ ] Revisit a scheduled sweep (expiry plus "paid, not sent" resend) if stale rows or stuck sends show up in practice.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
