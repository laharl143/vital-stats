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
}

export type OmsResult =
  | { ok: true; customerId: string; orderId: string }
  | { ok: false; message: string };

interface OmsOptions {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  paymentMethod: PaymentMethod;
  fetchFn?: typeof fetch;
}

const fail = (message: string): OmsResult => ({ ok: false, message });

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
};

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
  if (!opts.baseUrl || !opts.apiKey) return fail("The OMS connection isn't configured. Ask a developer to set OMS_BASE_URL and OMS_API_KEY.");

  const { baseUrl, apiKey } = opts;
  const doFetch = opts.fetchFn ?? fetch;

  // One POST. Returns the parsed JSON on 201, or a failure message.
  const post = async (path: string, body: { externalRef: string; [k: string]: unknown }): Promise<{ json: Record<string, unknown> } | { message: string }> => {
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
      return { message: "Couldn't reach the OMS. Please try again." };
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    // Any 2xx: a replayed idempotent call may answer 200 with the original result instead of 201.
    if (!res.ok || !json) {
      return { message: errorMessage(res.status, typeof json?.error === "string" ? json.error : undefined) };
    }
    return { json };
  };

  const intake = await post("/intake", {
    externalRef: `cust-${order.orderNumber}`,
    customer: { name: order.customerName, phone: order.customerContact, address: order.customerAddress },
  });
  if ("message" in intake) return fail(intake.message);
  const customerId = intake.json.customerId;
  if (typeof customerId !== "string") return fail("The OMS sent back an unexpected reply. Please try again.");

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
  });
  if ("message" in created) return fail(created.message);
  const orderId = created.json.orderId;
  if (typeof orderId !== "string") return fail("The OMS sent back an unexpected reply. Please try again.");

  return { ok: true, customerId, orderId };
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
