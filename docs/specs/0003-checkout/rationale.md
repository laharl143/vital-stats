# 0003. Checkout: decision record

## Context

The cart (spec 0002, feature 7.2) lets a guest collect priced, stock checked products, but it ends at a disabled "Checkout opens soon" button. Feature 7.3 (Jira VS-254, OMS repo `docs/scope/scope.md`) turns that cart into an order: contact details, a delivery address, a final availability check against the OMS, and a choice between paying online and cash on delivery. Its done when: a guest can place an order with name, phone, email and address; availability is checked again at submit and out of stock lines are refused clearly; a COD order is saved and waits for admin confirm as today; an online order goes to payment; a double submit never creates two orders.

The forces at play. The owner has already decided that a COD order waits for a storefront admin to confirm it, and that confirm is what sends it to the OMS (`POST /api/orders/[id]/confirm`, which refuses prescription products and replays idempotently). The OMS owns stock and price: it computes the order total as its own item prices plus a `shippingFee` (OMS spec 0023), and that is also the amount a courier collects on COD. Online payment (7.5) has no provider yet, and the prescription step (7.12) and customer accounts (7.13) are not built. The storefront database is also production, so the migration must only add. Checkout is the first place the storefront collects a delivery address and an email from the public, so RA 10173 applies (personal information, and health data if prescription products get through), and spec 0001 already fixed how consent is recorded on an order.

Not deciding leaves customers with a cart they can't use and keeps every sale on the phone.

## Options considered

### Option 1: One public route handler that rechecks the cart and saves a pending COD order, made safe to retry by a client key

A `POST /api/checkout` route validates the form, requotes the cart through the same code as `/api/cart/quote`, adds a flat fee, compares the total the customer saw, and saves a `PENDING` storefront order carrying a unique client generated `checkoutKey`. Staff confirm it through the existing admin flow.

**Pros**:
- Reuses the quote logic, the consent helper, the rate limit pattern, the admin email and the confirm route that already exist.
- Matches the route handler convention of every API in the repo, and the rules sit in a pure module that node:test covers.
- The unique key makes retries and double clicks harmless, with no extra table.
- Keeps the COD confirm flow the owner chose, so staff change nothing about how they work.

**Cons**:
- A second public endpoint that writes rows, which needs its own rate limit.
- The fee is a code constant, so changing it needs a deploy.

### Option 2: A Server Action on the checkout form

The same rules, but the form posts to a Next.js Server Action instead of a route handler.

**Pros**:
- Less client fetch code, and the form can submit before JavaScript loads.
- Typed arguments end to end.

**Cons**:
- A new pattern in a repo where every mutation is a route handler with the `{ data | error }` envelope.
- Harder to unit test with the node:test setup, and the checkout still needs client code for the live quote, the fee and the write back, so little is saved.
- Server Actions are public POST endpoints too, so the rate limit and validation work is the same.

### Option 3: Send storefront orders straight to the OMS at submit

The route calls `sendOrderToOms` as part of placing the order, so an online COD order skips the admin confirm.

**Pros**:
- Stock is allocated by the OMS right away, the true final word.
- No staff step for simple orders.

**Cons**:
- Goes against the owner's decision that COD orders wait for admin confirm (staff call to confirm before shipping, which cuts fake COD orders).
- Two OMS calls in the customer's request make checkout slower and fail whenever the OMS is down.
- Mixes 7.5's job (automatic send for paid orders) into 7.3.

## Rationale

Option 1 fits because almost every piece it needs already exists and has been verified: the quote route already turns lines into OMS prices and statuses, `readConsent` and `ConsentCheckbox` already record consent, the consult form already rate limits by IP on saved rows, `notifyAdmin` already emails staff, and the confirm route already sends orders to the OMS idempotently. Checkout is mostly the glue between them plus a form, and a route handler keeps it in the same shape and the same test harness as its neighbours.

The load bearing choices are about money and duplicates. Requoting on the server at submit, and comparing the total the customer saw to the centavo, means the customer only ever agrees to an exact amount, and because the fee is sent to the OMS as `shippingFee`, the courier collects that same amount. The client key is the cheapest way to make "a double submit never creates two orders" true even across network retries: a unique column, not a lock or a table. Blocking prescription products and showing online payment as "Coming soon" keep this feature from half building 7.12 and 7.5, whose own specs have the real decisions to make.

Option 3 was attractive for stock accuracy, but it overrides a decision the owner made for a business reason and makes checkout depend on the OMS being up. Option 2 would work, but it adds a second way of doing mutations to a small codebase for no real saving.
