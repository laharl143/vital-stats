# 0002. Cart: decision record

## Context

The storefront has no cart. Each product page has one "Order Now" link that opens the contact form, so a customer who wants two products sends an inquiry and waits for staff. Phase 7 (OMS repo `docs/scope/scope.md`, feature 7.2, Jira VS-253) makes buying self service. The cart is the second stop on Journey 1, after consent (7.1, spec 0001) and before checkout (7.3). It must work for guests, survive a reload, refuse out of stock items, handle empty and error states, and mark prescription products.

The forces at play: the OMS owns stock and, since spec 0023 in the OMS repo, the price a paid order is checked against. The availability endpoint (`GET /api/v1/products/availability`) needs the storefront's server side API key, returns `sku`, `available`, `price` and `currency`, and is rate limited per API client. The storefront `Product.slug` is the OMS `sku`. The storefront database is also production (no staging), so every migration lands on live data. Some products have no storefront price ("Price on inquiry"), and the OMS refuses paid orders with an unpriced item (`price_unknown`), an unknown SKU or an inactive product.

The owner has already decided that checkout checks OMS availability again at submit and that nothing holds stock during payment. The cart only needs to be accurate enough to avoid surprises, not a reservation. The team is small, so extra infrastructure has to earn its place.

Not deciding means checkout (7.3) has nothing to read from, and the product pages keep sending buyers to a contact form.

## Options considered

### Option 1: Browser cart of slugs and quantities, with a server quote endpoint over the OMS

localStorage holds `{ slug, qty }` lines. One public endpoint takes those lines and returns names, OMS prices, capped quantities and a status for each line, using a 30 second cached call to the OMS availability endpoint.

**Pros**:
- No schema change on the production database and no personal data stored.
- Prices and stock are always fresh from the server, so stale data can't be shown for long.
- Works for guests with zero sign in, and cross tab sync comes free from the `storage` event.
- The quote endpoint is exactly what checkout needs for its final check.

**Cons**:
- Per browser only; no cross device cart and no abandoned cart data.
- One public endpoint more, unlimited for now.

### Option 2: Database cart keyed by a cookie

`Cart` and `CartItem` tables, with an anonymous cart id in an HTTP only cookie; the server renders the cart.

**Pros**:
- Server side record of carts, useful for abandoned cart emails and analytics.
- Easier to merge into customer accounts later (7.13).

**Cons**:
- A migration on the shared production database, plus a cleanup job for abandoned carts.
- A database write on every add and quantity change.
- Still needs the same OMS price and stock lookup on read, so it adds storage without removing any work.

### Option 3: Cookie only cart read by server components

The lines live in a cookie that server components read directly, so the cart page renders on the server with no client fetch.

**Pros**:
- No client side fetch for the cart page; works without JavaScript for viewing.
- No database table.

**Cons**:
- Cookie size limits and the cart sent with every request to every page.
- Reading the cookie makes every page that shows the navbar count render dynamically.
- Changing quantities still needs client code or a server action per click.

## Rationale

Option 1 fits the forces best. The OMS already owns price and stock, so the storefront should not keep its own copy of either; storing only slugs and quantities means there is nothing to go stale and nothing personal to protect. That same fact is why Option 2 adds little today: a server cart would still have to ask the OMS for every read, and it would put a migration and a cleanup job on a database that is also production, for benefits (abandoned cart data, cross device carts) that belong to later features (7.7, 7.13) which can revisit this.

The quote endpoint is the load bearing piece. It keeps the OMS key on the server, caps what the public can learn about stock (`maxQty`, never `available`), and gives checkout the check it needs at submit. The 30 second cache was the owner's call over no cache. It protects the OMS rate limit and keeps pages fast, and the cost (a sold out product can look addable for up to 30 seconds) is covered by the cart's own next quote and by checkout's final check.

Option 3 is attractive for server rendering, but a cookie read in the shared Navbar would make every public page dynamic just to show a count, and quantity changes still need client code. A small `useSyncExternalStore` hook gets cross tab sync and a hydration safe count with far less reach.
