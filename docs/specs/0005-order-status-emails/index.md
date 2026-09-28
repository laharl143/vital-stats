# 0005. Order status page behind a secret link, and one customer email per order event

**Date**: 2026-09-27
**Status**: Accepted

## Summary

Every storefront order gets a secret link (a long random token saved on the order) that opens a private page at `/orders/<token>`. The page shows where the order is, what was bought and how it is being paid, and needs no login. Right after checkout the customer lands on that page, so it replaces the in place COD confirmation and ends the online `/checkout/done` wait. The customer also gets one email for each of six moments (received, paid, shipped, delivered, cancelled, refunded). Each email links back to the page and never names a product, and a small table makes sure no moment is ever emailed twice, even when the OMS webhook retries.

Jira: [VS-256](https://vital-stats.atlassian.net/browse/VS-256) (OMS scope 7.6). Builds on [0003](../0003-checkout/index.md) (checkout) and [0004](../0004-online-payment-oms-send/index.md) (online payment).

## Requirements

**User stories**:
- As a guest shopper, I want a page I can come back to that shows my order and where it is, so I don't have to message the shop to ask.
- As a guest shopper, I want an email when my order is received or paid, shipped, delivered, cancelled or refunded, so I know what is happening without checking.
- As a guest shopper buying health products, I want my inbox and forwarded emails to show no product names, so what I bought stays private.
- As the VitalStats owner, I want each event emailed exactly once, so customers aren't spammed when the OMS or PayMongo retries.

**Acceptance criteria**:
- **AC-1**: Every order saved by `POST /api/checkout` (COD and online) gets a `statusToken`: 32 bytes from `crypto.randomBytes`, base64url encoded (43 characters), unique. Admin created orders keep `statusToken` null. Existing orders are not backfilled.
- **AC-2**: The COD `201` reply and any replay of a COD order add `statusToken` to `data`. After a COD `201` or `200`, `CheckoutView` clears the cart and the stored `checkoutKey`, then does `router.replace("/orders/<token>?new=1")`. The in place `<Confirmation>` component is deleted.
- **AC-3**: `GET /api/checkout/status` adds `statusToken` to `data` when the state is `paid`, `refund_needed` or `refunded`. On `paid`, `PaymentDoneView` clears the cart and the stored key (as today), then does `window.location.replace("/orders/<token>?new=1")`. On `refund_needed` and `refunded` it replaces to the same page without clearing the cart. `expired`, the 60 second "still confirming" message and the missing key state stay exactly as spec 0004 AC-16 has them. An online replay past its window (spec 0004 AC-5) also returns `statusToken` when the state is one of those three.
- **AC-4**: `/orders/[token]` is a server rendered page, rendered on every request and never cached. Its metadata sets `robots: { index: false, follow: false }` and `referrer: "no-referrer"`. A token that is not 43 base64url characters, or that matches no order, calls `notFound()` (the site's normal 404, the same answer for both). Before reading an `AWAITING_PAYMENT` order it runs `expirePayments({ checkoutKey })` like the status endpoint, so an abandoned payment shows as expired.
- **AC-5**: The page shows: the order number; the date placed (Asia/Manila, e.g. "27 Sep 2026"); a progress line Received → Confirmed → Preparing → Out for delivery → Delivered with the current step marked (from `status`: `PENDING` = Received, `CONFIRMED` = Confirmed, `PROCESSING` = Preparing, `OUT_FOR_DELIVERY` = Out for delivery, `DELIVERED` = Delivered); each item's product name, quantity and line total; the subtotal, delivery fee and total; the payment line; and a delivery line with the customer's first name, city and province only. It never shows the phone, email, street, barangay, postal code, IP address, admin notes, OMS ids or PayMongo ids.
- **AC-6**: Instead of the progress line, a `CANCELLED` order shows "This order was cancelled." (plus the refund line from AC-7 when paid), and an `AWAITING_PAYMENT` order shows "Waiting for your payment." while it is still inside its window.
- **AC-7**: The payment line reads: COD "Pay ₱<total> in cash when it arrives." (after `DELIVERED`: "Paid in cash on delivery."); `PAID` "Paid online (<channel label>)"; `REFUND_NEEDED` "We received your payment but couldn't complete your order. Our team will contact you about your refund."; `REFUNDED` "Your payment of ₱<paidAmount> was refunded."; `EXPIRED` "Payment not completed." with a link to `/products`.
- **AC-8**: With `?new=1` the page opens with the heading "Thank you, your order is in", moves focus to it, and adds "We've emailed a copy to you. Keep the link in that email to check your order later." The `new` flag changes only that copy, nothing else.
- **AC-9**: The customer emails and their triggers. Each goes only to a storefront order that has a `customerEmail` and a `statusToken`:
  - `RECEIVED`: a COD order is newly saved (not on a replay).
  - `PAID`: `markPaid` returns `paid` (sent from `settlePaid`, before the OMS send).
  - `SHIPPED`: the order's status is newly written as `OUT_FOR_DELIVERY`.
  - `DELIVERED`: the order's status is newly written as `DELIVERED`.
  - `CANCELLED`: the order's status is newly written as `CANCELLED`, and the order is COD or its `paymentStatus` is `PAID` or `REFUND_NEEDED` (an expired unpaid online order gets no email; it never got a first one either).
  - `REFUNDED`: `refundOrder` succeeds, by API or by hand.
  "Newly written" means the OMS webhook's compare and set updated the row (not `stale`, not `duplicate`), or the admin `PATCH /api/orders/[id]` changed the status. `refundOrder` setting `CANCELLED` sends only `REFUNDED`.
- **AC-10**: Each (order, kind) pair is emailed at most once, ever. Before sending, a `CustomerEmail` row with that pair is inserted; a unique violation means it was already claimed and nothing is sent. The Resend call carries `idempotencyKey: "order-email/<orderId>/<kind>"`, so a crash between the send and the row update can't double send inside Resend's window. A webhook retried by the OMS or PayMongo therefore sends no second email.
- **AC-11**: Every email uses the existing branded layout (`renderNotificationEmail`, exported from `notify-admin.ts`) with rows Order (number), Items ("3 items", the sum of quantities), Total, Payment (the AC-7 wording, short form), and a "View your order" button linking to `${NEXTAUTH_URL}/orders/<token>`. It also sends a plain text version with the same rows and link. It never includes a product name, address, phone or the words of any admin note. From `RESEND_FROM_EMAIL`, to `customerEmail`.
- **AC-12**: Subjects and headings per kind: `RECEIVED` "We got your order <number>"; `PAID` "Payment received for order <number>"; `SHIPPED` "Your order <number> is on its way"; `DELIVERED` "Your order <number> was delivered"; `CANCELLED` "Your order <number> was cancelled" (paid orders add the line "We'll refund your payment of ₱<paidAmount>."); `REFUNDED` "Your refund for order <number>" with "₱<paidAmount> was refunded to your <channel label>. It can take a few days to show."
- **AC-13**: Emails are sent after the response or the status write has committed, always inside `after()` (the webhook included, so its answer to the OMS never waits on Resend). A failed send never fails or delays the checkout reply, the webhook answer, the refund or the admin action. A failure sets `failedAt` and `error` (a short code, never the provider body) on the claimed row; there is no automatic retry.
- **AC-14**: Without `RESEND_API_KEY` no email is sent and no row is claimed (a later configured environment can still send later events). Logs for customer email carry only the order number, the kind and an outcome (`sent`, `already_sent`, `skipped`, `failed`). Never the token, email address or name.
- **AC-15**: The admin order detail shows "Customer link" with a Copy button for an order that has a `statusToken`, so staff can text it to a customer whose email didn't arrive, and lists the customer emails sent for the order (kind, time, failed or sent).

## Decision

**Chosen option**: Option 2: a secret token link on the order, plus a claim table for emails.

Storefront orders get a random `statusToken` that alone opens `/orders/<token>`, customer emails are sent from one helper, and a unique `(orderId, kind)` row guarantees each one is sent at most once. See the `## Feature design` below.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Entity | Field | Type | Null | Notes |
|---|---|---|---|---|
| `Order` | `statusToken` | `String` | nullable | `@unique`; set for storefront orders only (AC-1) |
| `CustomerEmail` (new) | `id` | `String` | required | `@id @default(cuid())` |
| | `orderId` | `String` | required | FK to `Order.id`, `onDelete: Cascade` |
| | `kind` | `CustomerEmailKind` | required | new enum: `RECEIVED`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| | `createdAt` | `DateTime` | required | `@default(now())`, the claim time |
| | `sentAt` | `DateTime` | nullable | set when Resend accepts it |
| | `failedAt` | `DateTime` | nullable | set when the send failed |
| | `error` | `String` | nullable | short code only, e.g. `resend_422`, `no_recipient` |

`Order 1 ─ N CustomerEmail`, with `@@unique([orderId, kind])` on `CustomerEmail`. One migration.

**State transitions**: no new order states. The page maps the existing `OrderStatus` and `PaymentStatus` (AC-5 to AC-7). A `CustomerEmail` row goes claimed → sent, or claimed → failed. It never goes back, and it is never deleted except with its order.

**API surface**:

| Endpoint / function | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/orders/[token]` (page) | GET | `token` path, `new` query (opt) | the order view (AC-5 to AC-8) | public, the token is the key | 404 bad or unknown token |
| `/api/checkout` (changed) | POST | unchanged | COD: adds `statusToken` to `data`; online replay in a final state: adds `statusToken` | public, rate limited | unchanged |
| `/api/checkout/status` (changed) | GET | `key` | adds `statusToken` on `paid`, `refund_needed`, `refunded` | public, the checkout key | unchanged |
| `/api/orders/[id]` (changed) | GET | `id` | adds `statusToken` and `customerEmails[]` (kind, createdAt, sentAt, failedAt) | admin | unchanged |
| `emailCustomer(orderId, kind)` in `src/lib/notify-customer.ts` | function | order id, kind | `"sent" \| "already_sent" \| "skipped" \| "failed"`, never throws | server only | none thrown |
| `emailForStatus(orderId, status)` in the same file | function | order id, the newly written `OrderStatus` | maps `OUT_FOR_DELIVERY` → `SHIPPED`, `DELIVERED` → `DELIVERED`, `CANCELLED` → `CANCELLED` (AC-9 rule), else nothing | server only | none thrown |

Call sites: `/api/checkout` COD branch (`RECEIVED`, in `after()`), `settlePaid` (`PAID`, before `sendPaidOrder`), `/api/oms/webhook` when the outcome is `applied` (`emailForStatus`, in `after()` once the transaction has committed), `PATCH /api/orders/[id]` when `status` changed (`emailForStatus`, in `after()`), and the refund route after `refundOrder` returns ok (`REFUNDED`, in `after()`).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Place order | `statusToken` | `randomBytes(32).toString("base64url")` at create, retried with the order number loop on a unique clash |
| Redirect after COD | the token | the `201`/`200` reply `data.statusToken` |
| Redirect after online | the token | `/api/checkout/status` reply `data.statusToken` |
| Status page | order number, items (name snapshot, quantity, unit price), fee, total | `Order.orderNumber`, `OrderItem.productName`, `OrderItem.quantity`, `OrderItem.unitPrice`, `Order.shippingFee`, `Order.totalAmount` |
| Status page | subtotal | derived: `totalAmount` minus `shippingFee`, both through `toCentavos` / `formatCentavos` |
| Status page | date placed | `Order.createdAt`, formatted with `Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila" })` |
| Status page | progress step, cancelled or waiting | `Order.status` (AC-5, AC-6) |
| Status page, emails | payment line | `Order.paymentMethod`, `Order.paymentStatus`, `Order.paymentChannel`, `Order.paidAmount`, `Order.status` (AC-7) |
| Status page, emails | channel label | a label map beside the page (`card` → "card", `gcash` → "GCash", `maya` → "Maya", `grab_pay` → "GrabPay", `qrph` → "QR Ph", `dob` → "online banking", else "online payment") |
| Status page | first name | the first word of `Order.customerName` |
| Status page | city, province | parsed from `Order.customerAddress`, which `joinAddress` writes as `street, barangay, city, province postal`: the third comma part is the city, the fourth with its trailing 4 digit postal code removed is the province. An address the OMS rewrote (VS-250) that has fewer than four parts shows no delivery line |
| Emails | recipient | `Order.customerEmail` |
| Emails | item count | sum of `OrderItem.quantity` |
| Emails | link | `${NEXTAUTH_URL}/orders/${statusToken}` |
| Emails | sender | `RESEND_FROM_EMAIL`, falling back like `notifyAdmin` |
| Dedupe | once per event | the `CustomerEmail` unique `(orderId, kind)` claim plus the Resend `idempotencyKey` |
| Admin detail | customer link, emails sent | `Order.statusToken`, `CustomerEmail` rows |

**Key invariants**:
- At most one `CustomerEmail` row per `(orderId, kind)`, enforced by the database.
- The claim row is written before the send; a send only happens for a row this call inserted.
- A customer email or the status page never contains a product name in the email, nor a phone, email, street, barangay, postal code, admin note, OMS id or PayMongo id anywhere.
- The status page and every email read the order fresh from the database; nothing is cached.
- Nothing a customer does on the status page changes the order. The page is read only (the lazy expiry check of spec 0004 is the only write it can trigger, and it goes through `checkThenExpire`).
- Money on the page is formatted only with the existing `toCentavos` / `formatCentavos` / `peso` helpers (AGENTS.md rule).

**Security model**: The token is the only key to the page. With 256 bits of randomness it can't be guessed, so no rate limit or login is needed. Anyone holding the link can see the order, the same as a paper receipt. The page limits what the link reveals (AC-5): first name, city and province, items and money only. Product names can hint at health information, so they appear only behind the link, never in email subjects, previews or bodies (AC-11). `noindex` and `no-referrer` keep the link out of search engines and out of the `Referer` header sent to other sites. Logs never carry the token, email or name (AC-14). Admins read the token through the existing admin API behind `requireAdminSession`. RA 10173 (the Philippine Data Privacy Act) applies to the email address, name and address already collected in spec 0003. This feature uses the email address for the purpose the customer gave it (order updates), so no new consent is needed. Order emails are transactional, not marketing.

**Configuration required**: none new. It reuses `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `NEXTAUTH_URL`. Before real customers get emails, `RESEND_FROM_EMAIL` must be on a domain verified in Resend. The fallback `onboarding@resend.dev` only delivers to the Resend account owner.

**Critical test scenarios**:
- Happy path COD: place a COD order as "TEST" with your own email; you land on `/orders/<token>?new=1` with the thank you heading, the items, the fee, the total and "Pay ₱… in cash when it arrives."; one "We got your order" email arrives with no product names and a working link; the admin detail shows the link and one sent email. Verifies **AC-1**, **AC-2**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-11**, **AC-12**, **AC-15**
- Happy path online: pay in PayMongo test mode; `/checkout/done` moves on to the status page; one "Payment received" email arrives. Verifies **AC-3**, **AC-9**
- Status emails: the OMS webhook delivers `SHIPPED`, then the same event again, then `DELIVERED`; exactly one shipped and one delivered email; a stale `SHIPPED` arriving after `DELIVERED` sends nothing. Verifies **AC-9**, **AC-10**
- Cancel and refund: an OMS cancel on a paid order sends "was cancelled" with the refund line; the admin refund then sends "Your refund"; an online order that expired unpaid sends nothing. Verifies **AC-9**, **AC-12**
- Failure: Resend returns an error; the webhook still answers 200, the row has `failedAt`, a retried webhook sends nothing more; with no `RESEND_API_KEY` no row is created. Verifies **AC-10**, **AC-13**, **AC-14**
- Auth and privacy: a random 43 character token and a malformed token both get the same 404; the page HTML holds no phone, email, street or postal code; the server logs hold no token, email or name; admin order routes still need a session. Verifies **AC-4**, **AC-5**, **AC-14**

## Build plan

No build approach is recorded in `AGENTS.md`, so this assumes Tracer Bullet slices, like specs 0003 and 0004. Each slice ends runnable against the dev server.

1. [x] Migration: `Order.statusToken` (unique, nullable), the `CustomerEmailKind` enum and the `CustomerEmail` model with `@@unique([orderId, kind])`. `npx prisma migrate dev --name order-status-emails`. Satisfies **AC-1**, **AC-10**
2. [x] Thin thread: `/api/checkout` sets `statusToken` on every storefront create and returns it on COD `201`/`200` replies; minimal `/orders/[token]/page.tsx` (metadata, token check, `notFound()`, order number and status only); `CheckoutView` COD success does the redirect, and `<Confirmation>` is removed. Satisfies **AC-1**, **AC-2**, **AC-4**
3. [x] Full status page: `src/components/orders/OrderStatusView.tsx` (server component) with the progress line, cancelled and waiting states, items and money, the payment line and channel labels, the first name, city and province, the `?new=1` heading with focus (a tiny client child for the focus only), and the lazy `expirePayments` call. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
4. [x] Online hand off: `/api/checkout/status` and the online replay return `statusToken` in the three final states; `PaymentDoneView` replaces to the status page. Satisfies **AC-3**
5. [x] `src/lib/notify-customer.ts`: export `renderNotificationEmail` from `notify-admin.ts`; add `emailCustomer` (eligibility, claim insert, P2002 → `already_sent`, render, send with the idempotency key and a text part, `sentAt` or `failedAt`/`error`, logs) and `emailForStatus`. Tests in `src/lib/notify-customer.test.ts`, added to the `test` script. Satisfies **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**
6. [x] Wire `RECEIVED` into the `/api/checkout` COD branch (in `after()`), and `PAID` into `settlePaid`. Route tests in `checkout-routes.test.ts` and `payment-routes.test.ts`. Satisfies **AC-9**, **AC-13**
7. [x] Wire `emailForStatus` into `/api/oms/webhook` (only on `applied`) and `PATCH /api/orders/[id]` (only when the status changed), and `REFUNDED` into the refund route. Tests in `oms-webhook.test.ts` for `applied`, `stale` and `duplicate`. Satisfies **AC-9**, **AC-10**, **AC-13**
8. [x] Admin: `GET /api/orders/[id]` returns `statusToken` and `customerEmails`; the orders page detail shows "Customer link" with Copy and the email list. Satisfies **AC-15**

## Consequences

**Positive**:
- The customer has one lasting place for their order, from the moment they place it through delivery. The confirmation lost on refresh (spec 0003 consequence) is gone.
- Both checkout paths end on the same page, so there is one confirmation design to maintain.
- Every email trigger goes through two small functions, and the database guarantees no duplicates, whatever retries the OMS or PayMongo do.

**Negative / tradeoffs**:
- Anyone the customer forwards the link to sees the order (first name, city, items, total). There is no revoke yet.
- No automatic retry for a failed email: a customer can miss one message. Staff see the failure in admin and can text the link (AC-15). `ponytail: at most once with no retry, add a retry sweep over failedAt rows if bounce reports show real losses.`
- There is no "Confirmed" email for COD orders, so a COD customer hears nothing between "received" and "on its way" except the staff call.
- Orders placed before this ships have no token and get no emails or page.
- Real customer emails need a verified sending domain in Resend before launch.

**Neutral**:
- A new model and one column. The `CustomerEmail` table also serves as the record of what the customer was told.
- `renderNotificationEmail` becomes shared between admin and customer mail.
- `/checkout/done` stays as the short waiting room for online payment and no longer shows the final paid copy.

## Follow-up

- [ ] Before launch: verify a sending domain in Resend and set `RESEND_FROM_EMAIL` to it.
- [ ] Customer accounts (7.13) can list orders by email later. The token link stays valid alongside them.
- [ ] Consider a "Confirmed" email for COD orders if customers ask whether their order went through.
- [ ] A way to rotate a token (a new link) if a customer reports a forwarded link.
- [ ] `/sync` after build: note the `emailCustomer` rule (all customer email through it, never product names) in `AGENTS.md` `## Rules`.
