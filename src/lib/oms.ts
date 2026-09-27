// Hands a storefront order to the OMS (VS-243). Contract: openapi.yaml in the OMS repo.
//
// Two calls, intake then orders. Each sends an Idempotency-Key equal to the body's externalRef, so a
// retry must send a byte-identical payload (otherwise the OMS answers 409). Nothing is saved by this
// module; the caller persists the ids only after BOTH calls succeed, so a retry after a half-done
// attempt just replays the same two calls and gets the same customer back.
//
// Never log request or response bodies here or in the caller: they hold names and addresses.

export type PaymentMethod = "cod" | "prepaid";

export interface OmsOrderInput {
  orderNumber: string;
  customerName: string;
  customerContact: string;
  customerAddress: string | null;
  items: { quantity: number; product: { slug: string; requiresPrescription: boolean } }[];
  // Delivery fee as a 2 place string, e.g. "100.00" (spec 0003). Sent only when above zero, so an
  // order with no fee sends the same bytes as before and its OMS idempotency hash does not change.
  shippingFee?: string;
  // A paid online order (spec 0004, OMS spec 0023). Built only from stored columns so every retry
  // sends the same bytes. Sent only when present, so a COD body is unchanged.
  payment?: { amount: string; currency: string; provider: string; channel: string; reference: string; paidAt: string };
}

// retryable: the failure may pass on its own (network, timeout, 401, 5xx, customer_not_found).
// Otherwise the OMS refused the order for good, and a paid order needs a refund (spec 0004).
export type OmsResult =
  | { ok: true; customerId: string; orderId: string }
  | { ok: false; message: string; retryable: boolean };

interface OmsOptions {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  paymentMethod: PaymentMethod;
  fetchFn?: typeof fetch;
}

const fail = (message: string, retryable = false): OmsResult => ({ ok: false, message, retryable });

// Plain sentences for the admin, keyed by the OMS error code. Never the raw response text.
const ERROR_MESSAGES: Record<string, string> = {
  validation_error: "The OMS rejected this order's details as invalid. Check the customer name, contact, address and items.",
  unknown_sku: "The OMS doesn't stock one of the products in this order (unknown SKU), so it can't be sent yet.",
  customer_not_found: "The OMS lost track of this customer. Please try again.",
  idempotency_conflict: "The OMS already has an earlier attempt for this order with different details. Restore the original address and payment method and try again.",
  product_inactive: "One of the products in this order is inactive in the OMS.",
  no_physical_items: "This order has no physical items to ship, so the OMS can't take it.",
  mixed_currency: "This order mixes currencies, which the OMS can't take.",
  internal_error: "The OMS had an internal error. Please try again in a moment.",
  amount_mismatch: "The OMS total for this order differs from what the customer paid (a price changed). Refund the customer.",
  currency_mismatch: "The payment currency doesn't match the OMS product currency. Refund the customer.",
  price_unknown: "One of the products has no price in the OMS, so it can't take a paid order for it. Refund the customer.",
  payment_reference_used: "The OMS already has this PayMongo payment on another order. Check both orders before refunding.",
};

// Failures that may pass on their own; everything else is a refusal the same request can't fix.
const RETRYABLE_CODES = new Set(["customer_not_found", "internal_error"]);

function errorMessage(status: number, code: string | undefined): string {
  if (status === 401) return "The OMS refused our API key. Ask a developer to check OMS_API_KEY.";
  if (status === 503) return "The OMS is temporarily unavailable. Please try again in a moment.";
  return (code && ERROR_MESSAGES[code]) || "The OMS couldn't accept this order. Please try again.";
}

export async function sendOrderToOms(order: OmsOrderInput, opts: OmsOptions): Promise<OmsResult> {
  if (!order.customerAddress?.trim()) return fail("Add a shipping address before confirming this order.");
  if (order.items.some((i) => i.product.requiresPrescription)) {
    return fail("This order includes a prescription product. It needs the prescription path, which isn't built yet, so it stays pending.");
  }
  if (!opts.baseUrl || !opts.apiKey) return fail("The OMS connection isn't configured. Ask a developer to set OMS_BASE_URL and OMS_API_KEY.", true);

  const { baseUrl, apiKey } = opts;
  const doFetch = opts.fetchFn ?? fetch;

  // One POST. Returns the parsed JSON on 201, or a failure message.
  const post = async (path: string, body: { externalRef: string; [k: string]: unknown }): Promise<{ json: Record<string, unknown> } | { message: string; retryable: boolean }> => {
    let res: Response;
    try {
      res = await doFetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": body.externalRef,
        },
        body: JSON.stringify(body),
        // ponytail: fixed 10s cap, no backoff; the admin retries by hand.
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { message: "Couldn't reach the OMS. Please try again.", retryable: true };
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    // Any 2xx: a replayed idempotent call may answer 200 with the original result instead of 201.
    if (!res.ok || !json) {
      const code = typeof json?.error === "string" ? json.error : undefined;
      const retryable = res.status === 401 || res.status >= 500 || !json || (code !== undefined && RETRYABLE_CODES.has(code));
      return { message: errorMessage(res.status, code), retryable };
    }
    return { json };
  };

  const intake = await post("/intake", {
    externalRef: `cust-${order.orderNumber}`,
    customer: { name: order.customerName, phone: order.customerContact, address: order.customerAddress },
  });
  if ("message" in intake) return fail(intake.message, intake.retryable);
  const customerId = intake.json.customerId;
  if (typeof customerId !== "string") return fail("The OMS sent back an unexpected reply. Please try again.", true);

  // Sorted so a retry sends the same item order no matter how the database returns the rows.
  const items = order.items
    .map((i) => ({ sku: i.product.slug, qty: i.quantity }))
    .sort((a, b) => a.sku.localeCompare(b.sku) || a.qty - b.qty);
  const created = await post("/orders", {
    externalRef: order.orderNumber,
    customerId,
    items,
    paymentMethod: opts.paymentMethod,
    shippingAddress: order.customerAddress,
    ...(order.shippingFee && !/^0*(\.0*)?$/.test(order.shippingFee) && { shippingFee: order.shippingFee }),
    ...(order.payment && { payment: order.payment }),
  });
  if ("message" in created) return fail(created.message, created.retryable);
  const orderId = created.json.orderId;
  if (typeof orderId !== "string") return fail("The OMS sent back an unexpected reply. Please try again.", true);

  return { ok: true, customerId, orderId };
}

// Sellable stock and OMS price per SKU (VS-253, spec 0002). The storefront Product.slug is the
// OMS sku. The OMS only lists active, stock tracked products; anything missing is not sellable.
export interface OmsStock {
  available: number;
  price: string | null;
  currency: string | null;
}

export type OmsAvailability =
  | { ok: true; bySku: Map<string, OmsStock> }
  | { ok: false; reason: "not_configured" | "network" | "auth" | "server" | "bad_reply" };

const AVAILABILITY_PAGE = 500;
const AVAILABILITY_TTL_MS = 30_000;

// Last good answer, shared by every product and cart view for at most 30 seconds (spec 0002, AC-15).
// Not Next's fetch cache: `revalidate` serves the old answer while it refreshes in the background
// (and keeps it when the refresh fails), so a view could see stock of any age and an OMS outage
// looked "checked". Failures are never kept. ponytail: per server instance, fine for a 30 s cache.
let lastGood: { fetchFn: typeof fetch; baseUrl: string; at: number; value: OmsAvailability } | null = null;
export const clearAvailabilityCache = () => { lastGood = null; };

export async function getAvailability(opts: {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
  fresh?: boolean; // skip the 30 s cache: checkout's final check at submit (spec 0003, AC-11)
  now?: number;
}): Promise<OmsAvailability> {
  if (!opts.baseUrl || !opts.apiKey) return { ok: false, reason: "not_configured" };
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? Date.now();
  if (
    !opts.fresh && lastGood && lastGood.fetchFn === fetchFn && lastGood.baseUrl === opts.baseUrl &&
    now - lastGood.at < AVAILABILITY_TTL_MS
  ) {
    return lastGood.value;
  }
  const result = await fetchAvailability(opts.baseUrl, opts.apiKey, fetchFn);
  if (result.ok) lastGood = { fetchFn, baseUrl: opts.baseUrl, at: now, value: result };
  return result;
}

async function fetchAvailability(baseUrl: string, apiKey: string, fetchFn: typeof fetch): Promise<OmsAvailability> {
  let res: Response;
  try {
    res = await fetchFn(`${baseUrl.replace(/\/+$/, "")}/products/availability?limit=${AVAILABILITY_PAGE}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "network" }; // includes the timeout
  }
  if (res.status === 401) return { ok: false, reason: "auth" };
  if (!res.ok) return { ok: false, reason: "server" };
  const json = (await res.json().catch(() => null)) as unknown;
  if (!Array.isArray(json)) return { ok: false, reason: "bad_reply" };

  // ponytail: one page of 500, page through with offset when the catalog grows past it.
  const total = Number(res.headers.get("X-Total-Count"));
  if (total > AVAILABILITY_PAGE) console.warn(`[oms] availability has ${total} products, only the first ${AVAILABILITY_PAGE} are read`);

  const bySku = new Map<string, OmsStock>();
  for (const row of json as Record<string, unknown>[]) {
    if (typeof row?.sku !== "string" || typeof row.available !== "number") continue;
    bySku.set(row.sku, {
      available: row.available,
      price: typeof row.price === "string" ? row.price : null,
      currency: typeof row.currency === "string" ? row.currency : null,
    });
  }
  return { ok: true, bySku };
}

// Reads the order as the OMS holds it now (VS-250). Used by the webhook, which must answer the OMS
// within its 10 second wait, hence the shorter timeout. The reason is a code, safe to log.
export type OmsOrderRead =
  | { ok: true; shippingAddress: string }
  | { ok: false; reason: "not_configured" | "network" | "not_found" | "auth" | "server" | "bad_reply" };

export async function getOmsOrder(
  orderId: string,
  opts: { baseUrl: string | undefined; apiKey: string | undefined; fetchFn?: typeof fetch },
): Promise<OmsOrderRead> {
  if (!opts.baseUrl || !opts.apiKey) return { ok: false, reason: "not_configured" };
  let res: Response;
  try {
    res = await (opts.fetchFn ?? fetch)(`${opts.baseUrl.replace(/\/+$/, "")}/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return { ok: false, reason: "network" }; // includes the timeout
  }
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (res.status === 401) return { ok: false, reason: "auth" };
  if (!res.ok) return { ok: false, reason: "server" };
  const json = (await res.json().catch(() => null)) as { shippingAddress?: unknown } | null;
  if (typeof json?.shippingAddress !== "string") return { ok: false, reason: "bad_reply" };
  return { ok: true, shippingAddress: json.shippingAddress };
}
