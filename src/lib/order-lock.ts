// Once an order has been sent to the OMS (omsOrderId is set), the OMS is the source of truth for
// its status: only the OMS webhook (src/app/api/oms/webhook/route.ts) may change it (VS-246).
// Shared by the admin orders page (to disable the buttons) and PATCH /api/orders/[id] (to refuse).

export const OMS_LOCK_MESSAGE = "This order is in the OMS. Change its status there.";

// The OMS keeps the shipping address it was given at Confirm and can't change it (VS-248), so the
// storefront must not let its own copy drift apart from it either.
export const OMS_ADDRESS_LOCK_MESSAGE = "This order is in the OMS. The shipping address can't be changed here.";

export const isLockedByOms = (order: { omsOrderId?: string | null }): boolean => Boolean(order.omsOrderId);

// True when `next` (from a request body, so untyped) is a different address than `stored`, ignoring
// surrounding whitespace. A missing/null address counts as empty.
export const isAddressChange = (stored: string | null | undefined, next: unknown): boolean =>
  (stored ?? "").trim() !== (typeof next === "string" ? next.trim() : "");
