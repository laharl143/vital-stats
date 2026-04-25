"use client";

import { useEffect, useState } from "react";

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
  items: OrderItem[];
  createdAt: string;
}

const STATUS_OPTIONS = ["PENDING","CONFIRMED","PROCESSING","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:          { bg: "#FFF8E1", color: "#F57F17" },
  CONFIRMED:        { bg: "#E8F5E9", color: "#2E7D32" },
  PROCESSING:       { bg: "#E3F2FD", color: "#1565C0" },
  OUT_FOR_DELIVERY: { bg: "#F3E5F5", color: "#6A1B9A" },
  DELIVERED:        { bg: "#E8F5E9", color: "#1B5E20" },
  CANCELLED:        { bg: "#FFEBEE", color: "#C62828" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    const url = filterStatus === "ALL" ? "/api/orders?limit=50" : `/api/orders?status=${filterStatus}&limit=50`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => { setOrders(json.data ?? []); setLoading(false); });
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    fetchOrders();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Orders</h1>
        <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Track and manage customer orders.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", ...STATUS_OPTIONS].map((s) => (
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
                  onClick={() => setSelected(order)}
                  className="px-5 py-4 cursor-pointer transition-colors duration-150"
                  style={{ background: selected?.id === order.id ? "var(--teal-pale)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{order.customerName}</div>
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
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display font-light text-[24px]" style={{ color: "var(--ink)" }}>{selected.customerName}</h2>
                <div className="text-[13px]" style={{ color: "var(--teal)" }}>{selected.customerContact}</div>
              </div>
              <span
                className="text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-[2px]"
                style={STATUS_COLORS[selected.status] ?? STATUS_COLORS.PENDING}
              >
                {(selected.status ?? "").replace("_", " ")}
              </span>
            </div>

            {selected.customerAddress && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Address</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.customerAddress}</div>
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
              {selected.totalAmount && (
                <div className="flex justify-end mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    Total: ₱{parseFloat(selected.totalAmount).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {selected.notes && (
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Customer Notes</div>
                <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{selected.notes}</p>
              </div>
            )}

            {/* Update status */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Update Status</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    disabled={updating || selected.status === s}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border transition-all duration-200"
                    style={{
                      background: selected.status === s ? "var(--teal)" : "transparent",
                      color: selected.status === s ? "white" : "var(--ink-muted)",
                      borderColor: selected.status === s ? "var(--teal)" : "rgba(0,0,0,0.15)",
                      opacity: updating ? 0.6 : 1,
                      cursor: updating || selected.status === s ? "not-allowed" : "pointer",
                    }}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
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
