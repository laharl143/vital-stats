# 0005. Rationale: order status page and customer emails

## Context

A guest who places an order today gets one look at a confirmation. For COD it shows in place and disappears on refresh (spec 0003). For online payment, `/checkout/done` shows it only while the checkout key sits in that browser tab (spec 0004). After that the customer has nothing: no email, no page, and no account to log in to (accounts are 7.13, not built). Every "where is my order?" becomes a message to staff.

The storefront already knows every moment worth telling the customer about. Checkout saves the order. `markPaid` records a payment. The signed OMS webhook writes `CONFIRMED`, `PROCESSING`, `OUT_FOR_DELIVERY`, `DELIVERED` and `CANCELLED`, and `refundOrder` records refunds. Those writers are retried by design: the OMS delivers webhooks at least once and out of order, and PayMongo repeats its webhook until it gets a 2xx. Any email hung on them sends duplicates unless something stops it.

The products are health products (peptides, injectables), so a product name in an email subject or preview can reveal something about the customer's health to anyone who sees their inbox or a forwarded message. The order already holds personal information under RA 10173 (name, mobile, email, address). Anything that opens an order without a login must show as little of it as the customer needs.

The ticket's done bar: a confirmation with the order number, one email per status change with no duplicates on retries, and an email link that opens only that order and no health data beyond what the customer needs.

## Options considered

### Option 1: Order number plus email lookup form, emails sent inline

A `/orders/lookup` page asks for the order number and the email used at checkout. Emails are sent right where each status is written, relying on each writer's own dedupe (`OmsWebhookEvent`, `paymongoPaymentId`).

**Pros**:
- No new column on `Order`, and nothing secret to store.
- Works even when the email is deleted, if the customer remembers the number.

**Cons**:
- Order numbers are short and printed on parcels, and emails are easy to learn, so the pair is guessable. It needs a rate limit and still leaks to anyone who knows both.
- The writers' dedupe is per event, not per customer message. Two different OMS events that both map to `CONFIRMED`, or a manual admin status change plus a webhook, would each send.
- Emails sent inline delay the webhook answer and can fail it.

### Option 2: Secret token link, emails claimed in a table (chosen)

A random 256 bit `statusToken` on each storefront order opens `/orders/<token>`. All customer email goes through `emailCustomer`, which inserts a unique `(orderId, kind)` row before sending, and runs inside `after()`.

**Pros**:
- The token can't be guessed, so there's no rate limit, no form and no login.
- "Once per message" is enforced by the database, whatever the source of the trigger (webhook, retry, admin action).
- The claim rows are a record of what each customer was told, which staff can see.

**Cons**:
- A forwarded link shows the order to whoever has it, and there's no revoke yet.
- A new table and column to migrate.
- At most once with no retry: a Resend outage loses that message.

### Option 3: Signed link with no stored token

The link carries the order id plus an HMAC signature (a keyed hash that proves the server made it) from a server secret. Emails as in Option 2.

**Pros**:
- No token column; links can carry an expiry.

**Cons**:
- Rotating the secret breaks every link ever sent, and one leaked secret opens every order.
- Revoking a single order's link is impossible without storing something per order anyway.
- More crypto code to get right than one `randomBytes` call.

### Option 4: One time code by email

The customer enters their email, receives a 6 digit code, and sees their orders.

**Pros**:
- The strongest proof that the viewer owns the inbox, and a forwarded email alone doesn't expose the order.

**Cons**:
- A login flow in all but name: codes, expiry, attempts, rate limits, more email sends. It's really the start of customer accounts (7.13).
- The customer can't open their order in one tap from the email.

## Rationale

The forces are guest users with no accounts, retried writers, and health sensitive product names. Option 2 answers all three with the least machinery. A 256 bit token is the standard for "anyone with the link" access (the model receipts, invoices and shipment tracking use). It is one indexed column and one `randomBytes` call, and it lets the email button open the order in one tap. The guessable pair in Option 1 is a privacy bug under RA 10173. Option 4 is customer accounts under another name and belongs with 7.13.

Dedupe belongs at the message, not the event. The webhook tables already stop the same event applying twice, but the customer cares about messages: "your order shipped" once, however many events or hands moved it there. A unique `(orderId, kind)` row is the smallest thing the database can enforce. The Resend `idempotencyKey` covers the one gap the row can't (a crash after Resend accepted the email but before `sentAt` was written). At most once is the right side to fail on. A duplicate "your order shipped" erodes trust, while a missed one is backed by the status page and the admin Copy link.

Product names stay out of email and on the page behind the link. The page is where a customer checks what they bought, and the link is as private as the customer keeps it. Inboxes, lock screen previews and forwarded threads are not. The page also trims the address to first name, city and province, so a forwarded link doesn't hand over a home address and phone number.

Going straight to the status page after checkout (instead of keeping the in place confirmation) removes a second confirmation design and fixes the "lost on refresh" consequence of spec 0003. `/checkout/done` stays only as the waiting room for PayMongo's webhook, which spec 0004 needs. `RECEIVED` fires only for COD, because an online order's first real moment is payment. A "received" email for an order that then expires unpaid would confuse the customer. For the same reason, expired unpaid orders get no "cancelled" email.

Decisions made on the engineer's behalf (the engineer asked for the recommended pick throughout): token access over a lookup form (runner up: a lookup form alongside it); six emails with no COD "Confirmed" email (runner up: add it); the status page as the confirmation (runner up: keep the in place one plus a link); names on the page and a count in email (runner up: a count everywhere); first name, city and province only on the page (runner up: the full address, so the customer can spot a typo); at most once with no retry (runner up: a retry sweep over `failedAt` rows); no backfill of old orders (runner up: backfill storefront orders, pointless since they got no emails); a plain text part on every email (runner up: HTML only); the admin Copy link (runner up: none, and staff tell customers to check their email).
