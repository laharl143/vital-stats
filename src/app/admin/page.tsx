"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalProducts: number;
  newInquiries: number;
  pendingOrders: number;
  totalOrders: number;
}

interface Inquiry {
  id: string;
  name: string;
  contactInfo: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerContact: string;
  status: string;
  totalAmount: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEW:             { bg: "#E3F2FD", color: "#1565C0" },
  READ:            { bg: "#F3E5F5", color: "#6A1B9A" },
  RESPONDED:       { bg: "#E8F5E9", color: "#2E7D32" },
  CLOSED:          { bg: "#F5F5F5", color: "#616161" },
  PENDING:         { bg: "#FFF8E1", color: "#F57F17" },
  CONFIRMED:       { bg: "#E8F5E9", color: "#2E7D32" },
  PROCESSING:      { bg: "#E3F2FD", color: "#1565C0" },
  OUT_FOR_DELIVERY:{ bg: "#F3E5F5", color: "#6A1B9A" },
  DELIVERED:       { bg: "#E8F5E9", color: "#1B5E20" },
  CANCELLED:       { bg: "#FFEBEE", color: "#C62828" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?active=true").then((r) => r.json()),
      fetch("/api/inquiries?limit=5").then((r) => r.json()),
      fetch("/api/orders?limit=5").then((r) => r.json()),
      fetch("/api/inquiries?status=NEW&limit=1").then((r) => r.json()),
      fetch("/api/orders?status=PENDING&limit=1").then((r) => r.json()),
    ]).then(([products, inquiries, orders, newInq, pendingOrd]) => {
      setStats({
        totalProducts: products.data?.length ?? 0,
        newInquiries: newInq.meta?.total ?? 0,
        pendingOrders: pendingOrd.meta?.total ?? 0,
        totalOrders: orders.meta?.total ?? 0,
      });
      setRecentInquiries(inquiries.data ?? []);
      setRecentOrders(orders.data ?? []);
      setLoading(false);
    });
  }, []);

  const statCards = stats
    ? [
        { label: "Total Products", value: stats.totalProducts, icon: "◈", color: "var(--teal)" },
        { label: "New Inquiries", value: stats.newInquiries, icon: "✉", color: "#1565C0", alert: stats.newInquiries > 0 },
        { label: "Pending Orders", value: stats.pendingOrders, icon: "📦", color: "#F57F17", alert: stats.pendingOrders > 0 },
        { label: "Total Orders", value: stats.totalOrders, icon: "✓", color: "#2E7D32" },
      ]
    : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>
          Dashboard
        </h1>
        <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
          Welcome back. Here&apos;s what&apos;s happening at VitalStats.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] rounded-[8px] animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="p-5 rounded-[8px] flex flex-col gap-2"
              style={{
                background: "#ffffff",
                border: card.alert ? `1px solid ${card.color}40` : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-faint)" }}>
                  {card.label}
                </span>
                <span className="text-[18px]">{card.icon}</span>
              </div>
              <div className="font-display text-[36px] font-light leading-none" style={{ color: card.color }}>
                {card.value}
              </div>
              {card.alert && (
                <div className="text-[10px] tracking-[0.06em]" style={{ color: card.color }}>
                  Needs attention
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="rounded-[8px] overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>Recent Inquiries</h2>
            <a href="/admin/inquiries" className="text-[11px] tracking-[0.06em] uppercase" style={{ color: "var(--teal)" }}>
              View all →
            </a>
          </div>
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded animate-pulse" style={{ background: "rgba(0,0,0,0.04)" }} />
              ))}
            </div>
          ) : recentInquiries.length === 0 ? (
            <div className="p-6 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>No inquiries yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {recentInquiries.map((inq) => (
                <div key={inq.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{inq.name}</div>
                    <div className="text-[12px] truncate" style={{ color: "var(--ink-faint)" }}>{(inq.message ?? "").slice(0, 60)}...</div>
                  </div>
                  <span
                    className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0"
                    style={STATUS_COLORS[inq.status] ?? STATUS_COLORS.CLOSED}
                  >
                    {inq.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-[8px] overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>Recent Orders</h2>
            <a href="/admin/orders" className="text-[11px] tracking-[0.06em] uppercase" style={{ color: "var(--teal)" }}>
              View all →
            </a>
          </div>
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded animate-pulse" style={{ background: "rgba(0,0,0,0.04)" }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-6 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>No orders yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{order.customerName}</div>
                    <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      {order.totalAmount ? `₱${parseFloat(order.totalAmount).toLocaleString()}` : "Price on inquiry"}
                    </div>
                  </div>
                  <span
                    className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0"
                    style={STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
