"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AWAITING_PAYMENT_LOCK_MESSAGE, OMS_LOCK_MESSAGE, isLockedByOms } from "@/lib/order-lock";
import { formatConsentLine } from "@/lib/legal";
import NewOrderForm from "@/components/admin/NewOrderForm";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerContact: string;
  customerAddress: string | null;
  status: string;
  notes: string | null;
  adminNotes: string | null;
  totalAmount: string | null;
  omsOrderId: string | null;
  // Storefront checkout fields (spec 0003); admin created orders have the defaults and nulls.
  source?: "ADMIN" | "STOREFRONT";
  paymentMethod?: "COD" | "PREPAID" | null;
  customerEmail?: string | null;
  shippingFee?: string | null;
  stockUnchecked?: boolean;
  privacyVersion?: string | null;
  consentedAt?: string | null;
  // Online payment (spec 0004); null for COD and admin orders.
  paymentStatus?: PaymentStatus | null;
  paymentChannel?: string | null;
  paymongoPaymentId?: string | null;
  paidAt?: string | null;
  paidAmount?: string | null;
  omsSendError?: string | null;
  refundId?: string | null;
  refundedAt?: string | null;
  // Order status page and customer emails (spec 0005).
  statusToken?: string | null;
  customerEmails?: { kind: string; createdAt: string; sentAt: string | null; failedAt: string | null }[];
  items: OrderItem[];
  createdAt: string;
}

type PaymentStatus = "UNPAID" | "PAID" | "REFUND_NEEDED" | "REFUNDED" | "EXPIRED";

const PAYMENT_LABELS = { COD: "Cash on delivery", PREPAID: "Prepaid" } as const;
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Awaiting payment",
  PAID: "Paid",
  REFUND_NEEDED: "Refund needed",
  REFUNDED: "Refunded",
  EXPIRED: "Payment expired",
};
const peso = (amount: string | null | undefined) => `₱${parseFloat(amount ?? "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const hasFee = (fee: string | null | undefined) => !!fee && parseFloat(fee) > 0;

function OnlineBadge() {
  return (
    <span className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0" style={{ background: "var(--teal-pale)", color: "var(--teal-dark)" }}>
      Online
    </span>
  );
}

const STATUS_OPTIONS = ["PENDING","CONFIRMED","PROCESSING","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
// AWAITING_PAYMENT is a filter and a badge only: nobody sets it by hand (spec 0004, AC-17).
const FILTER_OPTIONS = ["AWAITING_PAYMENT", ...STATUS_OPTIONS];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  AWAITING_PAYMENT: { bg: "#ECEFF1", color: "#455A64" },
  PENDING:          { bg: "#FFF8E1", color: "#F57F17" },
  CONFIRMED:        { bg: "#E8F5E9", color: "#2E7D32" },
  PROCESSING:       { bg: "#E3F2FD", color: "#1565C0" },
  OUT_FOR_DELIVERY: { bg: "#F3E5F5", color: "#6A1B9A" },
  DELIVERED:        { bg: "#E8F5E9", color: "#1B5E20" },
  CANCELLED:        { bg: "#FFEBEE", color: "#C62828" },
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersPageContent />
    </Suspense>
  );
}

function AdminOrdersPageContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "prepaid">("cod");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [refundFailed, setRefundFailed] = useState(false);
  const [refundNote, setRefundNote] = useState("");

  const fetchOrders = useCallback(() => {
    const url = filterStatus === "ALL" ? "/api/orders?limit=50" : `/api/orders?status=${filterStatus}&limit=50`;
    Promise.resolve()
      .then(() => setLoading(true))
      .then(() => fetch(url))
      .then((r) => r.json())
      .then((json) => { setOrders(json.data ?? []); setLoading(false); });
  }, [filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setSelected(json.data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    setActionError(null);
    setCreatedId(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error ?? "Couldn't update the status. Please try again.");
        return;
      }
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
      fetchOrders();
    } catch {
      setActionError("Couldn't update the status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Confirming hands the order to the OMS on the server; the order only becomes CONFIRMED if that works.
  const confirmOrder = async (id: string) => {
    setUpdating(true);
    setActionError(null);
    setCreatedId(null);
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(json?.error ?? "Couldn't confirm the order. Please try again.");
        return;
      }
      setConfirmingId(null);
      if (selected?.id === id) setSelected(json.data);
      fetchOrders();
    } catch {
      setActionError("Couldn't confirm the order. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Refund a paid online order (spec 0004, AC-12): through PayMongo, or recorded as done by hand.
  const refundOrder = async (id: string, manualNote?: string) => {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualNote === undefined ? {} : { manual: true, note: manualNote }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(json?.error ?? "Couldn't refund the order. Please try again.");
        if (manualNote === undefined && res.status === 422) setRefundFailed(true);
        return;
      }
      setRefundFailed(false);
      setRefundNote("");
      if (selected?.id === id) setSelected(json.data);
      fetchOrders();
    } catch {
      setActionError("Couldn't refund the order. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // A sent order's status belongs to the OMS, and an unpaid online order's status moves on its own:
  // every manual status button is disabled for both.
  const locked = selected ? isLockedByOms(selected) || selected.status === "AWAITING_PAYMENT" : false;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Orders</h1>
        <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Track and manage customer orders.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", ...FILTER_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="text-[11px] tracking-[0.06em] uppercase px-4 py-2 rounded-[3px] border transition-all duration-200"
            style={{
              background: filterStatus === s ? "var(--teal)" : "transparent",
              color: filterStatus === s ? "white" : "var(--ink-muted)",
              borderColor: filterStatus === s ? "var(--teal)" : "rgba(0,0,0,0.15)",
            }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* New order */}
      <div className="mb-6">
        {showNewOrder ? (
          <NewOrderForm
            onCancel={() => setShowNewOrder(false)}
            onCreated={(order) => {
              setShowNewOrder(false);
              setSelected(order as Order);
              setCreatedId(order.id);
              setActionError(null);
              fetchOrders();
            }}
          />
        ) : (
          <button
            onClick={() => setShowNewOrder(true)}
            className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px]"
            style={{ background: "var(--teal)", color: "white" }}
          >
            New order
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="rounded-[8px] overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded animate-pulse" style={{ background: "rgba(0,0,0,0.04)" }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>No orders found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => { setSelected(order); setRefundFailed(false); setActionError(null); }}
                  className="px-5 py-4 cursor-pointer transition-colors duration-150"
                  style={{ background: selected?.id === order.id ? "var(--teal-pale)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{order.customerName}</div>
                      {order.source === "STOREFRONT" && <OnlineBadge />}
                    </div>
                    <span
                      className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0"
                      style={STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING}
                    >
                      {(order.status ?? "").replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] mb-1" style={{ color: "var(--teal)" }}>{order.customerContact}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--ink)" }}>
                      {order.totalAmount ? `₱${parseFloat(order.totalAmount).toLocaleString()}` : "On inquiry"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="rounded-[8px] p-6 flex flex-col gap-5" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
            {createdId === selected.id && (
              <p className="text-[12px]" style={{ color: "#2E7D32" }}>Order created.</p>
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-light text-[24px]" style={{ color: "var(--ink)" }}>{selected.customerName}</h2>
                  {selected.source === "STOREFRONT" && <OnlineBadge />}
                </div>
                <div className="text-[13px]" style={{ color: "var(--teal)" }}>{selected.customerContact}</div>
                {selected.customerEmail && (
                  <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>{selected.customerEmail}</div>
                )}
              </div>
              <span
                className="text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-[2px]"
                style={STATUS_COLORS[selected.status] ?? STATUS_COLORS.PENDING}
              >
                {(selected.status ?? "").replace("_", " ")}
              </span>
            </div>

            {selected.stockUnchecked && (
              <p className="text-[12px] px-3 py-2 rounded-[4px]" style={{ background: "#FFF8E1", color: "#8D5A00" }}>
                Stock not checked at checkout (the OMS was unreachable). Check availability before confirming.
              </p>
            )}

            {selected.customerAddress && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Address</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.customerAddress}</div>
                {locked && (
                  <>
                    <div className="text-[11px] mt-1" style={{ color: "var(--ink-faint)" }}>Sent to the OMS. The address can&apos;t be changed here.</div>
                    <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Changes made in the OMS show here automatically.</div>
                  </>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-3" style={{ color: "var(--ink-faint)" }}>Order Items</div>
              <div className="flex flex-col gap-2">
                {selected.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 rounded-[4px]"
                    style={{ background: "var(--cream)" }}
                  >
                    <div className="text-[13px]" style={{ color: "var(--ink)" }}>{item.productName}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>x{item.quantity}</div>
                      {item.unitPrice && (
                        <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                          ₱{parseFloat(item.unitPrice).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasFee(selected.shippingFee) && (
                <div className="flex justify-between mt-3 px-4 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  <span>Delivery fee</span>
                  <span>₱{parseFloat(selected.shippingFee!).toLocaleString()}</span>
                </div>
              )}
              {selected.totalAmount && (
                <div className="flex justify-end mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    Total: ₱{parseFloat(selected.totalAmount).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {selected.source === "STOREFRONT" && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Consent</div>
                <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {formatConsentLine(selected.privacyVersion ?? null, selected.consentedAt ?? null)}
                </div>
              </div>
            )}

            {selected.statusToken && <CustomerLink token={selected.statusToken} emails={selected.customerEmails ?? []} />}

            {selected.paymentStatus && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Online payment</div>
                <div className="text-[13px] flex flex-col gap-1" style={{ color: "var(--ink-muted)" }}>
                  <div>
                    <span className="font-medium" style={{ color: "var(--ink)" }}>{PAYMENT_STATUS_LABELS[selected.paymentStatus]}</span>
                    {selected.paidAmount && <> · {peso(selected.paidAmount)}</>}
                    {selected.paymentChannel && <> · {selected.paymentChannel}</>}
                  </div>
                  {selected.paymongoPaymentId && <div>PayMongo payment {selected.paymongoPaymentId}</div>}
                  {selected.paidAt && <div>Paid on {new Date(selected.paidAt).toLocaleString("en-PH")}</div>}
                  {selected.refundedAt && (
                    <div>
                      Refunded on {new Date(selected.refundedAt).toLocaleString("en-PH")}
                      {selected.refundId ? ` (PayMongo refund ${selected.refundId})` : " (by hand, see admin notes)"}
                    </div>
                  )}
                </div>

                {selected.omsSendError && selected.paymentStatus !== "REFUNDED" && (
                  <p className="text-[12px] mt-2 px-3 py-2 rounded-[4px]" style={{ background: "#FFF8E1", color: "#8D5A00" }}>
                    {selected.paymentStatus === "PAID" && !selected.omsOrderId ? "Paid, not sent to OMS. " : ""}
                    {selected.omsSendError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {selected.paymentStatus === "PAID" && !selected.omsOrderId && (
                    <button
                      onClick={() => confirmOrder(selected.id)}
                      disabled={updating}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px]"
                      style={{ background: "var(--teal)", color: "white", opacity: updating ? 0.6 : 1 }}
                    >
                      Send to OMS
                    </button>
                  )}
                  {(selected.paymentStatus === "REFUND_NEEDED" || (selected.paymentStatus === "PAID" && !selected.omsOrderId)) && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Refund ${peso(selected.paidAmount)} to the customer through PayMongo? This cancels the order.`)) {
                          refundOrder(selected.id);
                        }
                      }}
                      disabled={updating}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
                      style={{ color: "#C62828", borderColor: "#C62828", opacity: updating ? 0.6 : 1 }}
                    >
                      Refund {peso(selected.paidAmount)}
                    </button>
                  )}
                </div>

                {refundFailed && (selected.paymentStatus === "REFUND_NEEDED" || selected.paymentStatus === "PAID") && (
                  <div className="mt-3 p-4 rounded-[4px] flex flex-col gap-2" style={{ background: "var(--cream)" }}>
                    <label htmlFor="manual-refund-note" className="text-[12px]" style={{ color: "var(--ink)" }}>
                      Refunded the customer another way? Say how (for example, the bank transfer reference).
                    </label>
                    <textarea
                      id="manual-refund-note"
                      rows={2}
                      maxLength={500}
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      className="px-3 py-2 text-[13px] rounded-[3px] border"
                      style={{ borderColor: "rgba(0,0,0,0.15)" }}
                    />
                    <button
                      onClick={() => refundOrder(selected.id, refundNote)}
                      disabled={updating || !refundNote.trim()}
                      className="self-start text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
                      style={{ color: "var(--ink)", borderColor: "rgba(0,0,0,0.15)", opacity: updating || !refundNote.trim() ? 0.6 : 1 }}
                    >
                      Mark refunded manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {selected.notes && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Customer Notes</div>
                <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{selected.notes}</p>
              </div>
            )}

            {/* Update status */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Update Status</div>
              {actionError && (
                <p className="text-[12px] mb-2" style={{ color: "#C62828" }}>{actionError}</p>
              )}
              {locked && (
                <p className="text-[12px] mb-2" style={{ color: "var(--ink-muted)" }}>
                  {selected.status === "AWAITING_PAYMENT" ? AWAITING_PAYMENT_LOCK_MESSAGE : OMS_LOCK_MESSAGE}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => (s === "CONFIRMED" ? setConfirmingId(selected.id) : updateStatus(selected.id, s))}
                    disabled={updating || locked || selected.status === s || (s === "CONFIRMED" && selected.status !== "PENDING")}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border transition-all duration-200"
                    style={{
                      background: selected.status === s ? "var(--teal)" : "transparent",
                      color: selected.status === s ? "white" : "var(--ink-muted)",
                      borderColor: selected.status === s ? "var(--teal)" : "rgba(0,0,0,0.15)",
                      opacity: updating || locked ? 0.6 : 1,
                      cursor: updating || locked || selected.status === s ? "not-allowed" : "pointer",
                    }}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>

              {confirmingId === selected.id && selected.status === "PENDING" && (
                <div className="mt-3 p-4 rounded-[4px] flex flex-col gap-3" style={{ background: "var(--cream)" }}>
                  <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                    Confirming sends this order to the OMS. It stays pending if that fails.
                  </div>
                  {selected.customerAddress?.trim() && (
                    <div>
                      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Shipping address</div>
                      <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.customerAddress}</div>
                    </div>
                  )}
                  <p className="text-[12px] font-medium" style={{ color: "var(--ink)" }}>
                    After you send this order, the shipping address cannot be changed here. Check it now.
                  </p>
                  {!selected.customerAddress?.trim() && (
                    <p className="text-[12px]" style={{ color: "#C62828" }}>Add a shipping address before confirming this order.</p>
                  )}
                  {selected.paymentMethod ? (
                    <p className="text-[12px]" style={{ color: "var(--ink)" }}>
                      Payment method: {PAYMENT_LABELS[selected.paymentMethod]} (chosen by the customer at checkout)
                    </p>
                  ) : (
                  <label className="text-[12px] flex items-center gap-2" style={{ color: "var(--ink)" }}>
                    Payment method
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cod" | "prepaid")}
                      className="px-2 py-1 rounded-[3px] border"
                      style={{ borderColor: "rgba(0,0,0,0.15)" }}
                    >
                      <option value="cod">Cash on delivery</option>
                      <option value="prepaid">Prepaid</option>
                    </select>
                  </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmOrder(selected.id)}
                      disabled={updating || !selected.customerAddress?.trim()}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px]"
                      style={{ background: "var(--teal)", color: "white", opacity: updating || !selected.customerAddress?.trim() ? 0.6 : 1 }}
                    >
                      Send to OMS &amp; confirm
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      disabled={updating}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
                      style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              Placed on {new Date(selected.createdAt).toLocaleString("en-PH")}
            </div>
          </div>
        ) : (
          <div
            className="rounded-[8px] flex items-center justify-center"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", minHeight: 300 }}
          >
            <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

// The customer's order status link, to text them if their email didn't arrive, and the order emails
// sent so far (spec 0005, AC-15).
const EMAIL_LABELS: Record<string, string> = {
  RECEIVED: "Order received", PAID: "Payment received", SHIPPED: "On its way",
  DELIVERED: "Delivered", CANCELLED: "Cancelled", REFUNDED: "Refunded",
};
function CustomerLink({ token, emails }: { token: string; emails: NonNullable<Order["customerEmails"]> }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/orders/${token}`;
  const copy = () =>
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Customer link</div>
      <div className="flex items-center gap-2">
        <a href={url} target="_blank" rel="noreferrer" className="text-[13px] underline truncate" style={{ color: "var(--teal)" }}>
          Order status page
        </a>
        <button type="button" onClick={copy} className="text-[11px] tracking-[0.06em] uppercase px-2 py-1 rounded-[3px]" style={{ border: "1px solid rgba(0,0,0,0.12)", color: "var(--ink)" }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="text-[12px] mt-2 flex flex-col gap-0.5" style={{ color: "var(--ink-muted)" }}>
        {emails.length === 0
          ? "No customer emails sent yet."
          : emails.map((e) => (
              <div key={e.kind}>
                {EMAIL_LABELS[e.kind] ?? e.kind} email · {new Date(e.createdAt).toLocaleString()} ·{" "}
                {e.sentAt ? "sent" : e.failedAt ? <span style={{ color: "#B3261E" }}>failed</span> : "sending"}
              </div>
            ))}
      </div>
    </div>
  );
}
