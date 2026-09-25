// Once an order has been sent to the OMS (omsOrderId is set), the OMS is the source of truth for
// its status: only the OMS webhook (src/app/api/oms/webhook/route.ts) may change it (VS-246).
// Shared by the admin orders page (to disable the buttons) and PATCH /api/orders/[id] (to refuse).

export const OMS_LOCK_MESSAGE = "This order is in the OMS. Change its status there.";

export const isLockedByOms = (order: { omsOrderId?: string | null }): boolean => Boolean(order.omsOrderId);
