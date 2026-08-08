"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Package,
  Mail,
  Stethoscope,
  Truck,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useAdminTheme, type AdminTheme } from "@/contexts/AdminThemeContext";

interface Totals {
  totalProducts: number;
  newInquiries: number;
  newConsultRequests: number;
  pendingOrders: number;
  totalOrders: number;
}

interface Deltas {
  inquiriesThisWeek: number;
  consultsThisWeek: number;
  ordersThisWeek: number;
}

interface Series {
  days: string[];
  inquiries: number[];
  consults: number[];
  orders: number[];
}

interface ActivityItem {
  id: string;
  type: "inquiry" | "consult" | "order";
  name: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totals: Totals;
  deltas: Deltas;
  series: Series;
  recentActivity: ActivityItem[];
}

type StatusStyle = { bg: string; color: string; border: string };

const STATUS_COLORS_DARK: Record<string, StatusStyle> = {
  NEW:              { bg: "rgba(95,180,232,0.08)",  color: "#5FB4E8", border: "rgba(95,180,232,0.35)" },
  READ:             { bg: "rgba(196,140,240,0.08)",  color: "#C48CF0", border: "rgba(196,140,240,0.35)" },
  RESPONDED:        { bg: "rgba(63,217,174,0.08)",   color: "#3FD9AE", border: "rgba(63,217,174,0.35)" },
  CLOSED:           { bg: "rgba(148,163,153,0.08)",  color: "#94A399", border: "#2A3128" },
  PENDING:          { bg: "rgba(240,184,64,0.08)",   color: "#F0B840", border: "rgba(240,184,64,0.35)" },
  CONFIRMED:        { bg: "rgba(63,217,174,0.08)",   color: "#3FD9AE", border: "rgba(63,217,174,0.35)" },
  PROCESSING:       { bg: "rgba(95,180,232,0.08)",   color: "#5FB4E8", border: "rgba(95,180,232,0.35)" },
  OUT_FOR_DELIVERY: { bg: "rgba(196,140,240,0.08)",  color: "#C48CF0", border: "rgba(196,140,240,0.35)" },
  DELIVERED:        { bg: "rgba(63,217,174,0.08)",   color: "#3FD9AE", border: "rgba(63,217,174,0.35)" },
  CANCELLED:        { bg: "rgba(255,107,94,0.08)",   color: "#FF6B5E", border: "rgba(255,107,94,0.35)" },
  REVIEWED:         { bg: "rgba(196,140,240,0.08)",  color: "#C48CF0", border: "rgba(196,140,240,0.35)" },
  CONTACTED:        { bg: "rgba(63,217,174,0.08)",   color: "#3FD9AE", border: "rgba(63,217,174,0.35)" },
};

const STATUS_COLORS_LIGHT: Record<string, StatusStyle> = {
  NEW:              { bg: "#E3F2FD", color: "#1565C0", border: "#BBDEFB" },
  READ:             { bg: "#F3E5F5", color: "#6A1B9A", border: "#E1BEE7" },
  RESPONDED:        { bg: "#E8F5E9", color: "#2E7D32", border: "#C8E6C9" },
  CLOSED:           { bg: "#F5F5F5", color: "#616161", border: "#E0E0E0" },
  PENDING:          { bg: "#FFF8E1", color: "#F57F17", border: "#FFECB3" },
  CONFIRMED:        { bg: "#E8F5E9", color: "#2E7D32", border: "#C8E6C9" },
  PROCESSING:       { bg: "#E3F2FD", color: "#1565C0", border: "#BBDEFB" },
  OUT_FOR_DELIVERY: { bg: "#F3E5F5", color: "#6A1B9A", border: "#E1BEE7" },
  DELIVERED:        { bg: "#E8F5E9", color: "#1B5E20", border: "#C8E6C9" },
  CANCELLED:        { bg: "#FFEBEE", color: "#C62828", border: "#FFCDD2" },
  REVIEWED:         { bg: "#F3E5F5", color: "#6A1B9A", border: "#E1BEE7" },
  CONTACTED:        { bg: "#E8F5E9", color: "#2E7D32", border: "#C8E6C9" },
};

type TypeMeta = { label: string; dot: string; href: string };

const TYPE_META_DARK: Record<ActivityItem["type"], TypeMeta> = {
  inquiry: { label: "inquiry", dot: "#5FB4E8", href: "/admin/inquiries" },
  consult: { label: "consult", dot: "#C48CF0", href: "/admin/medical-history" },
  order:   { label: "order",   dot: "#3FD9AE", href: "/admin/orders" },
};

const TYPE_META_LIGHT: Record<ActivityItem["type"], TypeMeta> = {
  inquiry: { label: "inquiry", dot: "#1565C0", href: "/admin/inquiries" },
  consult: { label: "consult", dot: "#6A1B9A", href: "/admin/medical-history" },
  order:   { label: "order",   dot: "#1D6B57", href: "/admin/orders" },
};

const DASH_TOKENS: Record<AdminTheme, Record<string, string>> = {
  dark: {
    "--cc-bg": "#0A0F0E",
    "--cc-surface": "#0F1614",
    "--cc-border": "#22302B",
    "--cc-border-soft": "#1A2521",
    "--cc-ink": "#EAF2EF",
    "--cc-ink-mid": "#B7C6C1",
    "--cc-ink-faint": "#5C716A",
    "--cc-teal": "#3FD9AE",
    "--cc-red": "#FF6B5E",
    "--cc-blue": "#5FB4E8",
    "--cc-purple": "#C48CF0",
  },
  light: {
    "--cc-bg": "#F3F5F3",
    "--cc-surface": "#FFFFFF",
    "--cc-border": "#DEE4E0",
    "--cc-border-soft": "#EAEEEB",
    "--cc-ink": "#10201B",
    "--cc-ink-mid": "#34433D",
    "--cc-ink-faint": "#8A968F",
    "--cc-teal": "#1D6B57",
    "--cc-red": "#B23A34",
    "--cc-blue": "#1565C0",
    "--cc-purple": "#6A1B9A",
  },
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isAllZero(values: number[]) {
  return values.every((v) => v === 0);
}

function valueToY(v: number, max: number, height: number, topPad: number) {
  return topPad + (1 - v / max) * (height - topPad);
}

function toScaledPoints(values: number[], width: number, height: number, max: number, topPad = 0): [number, number][] {
  const step = width / (values.length - 1 || 1);
  return values.map((v, i) => [i * step, valueToY(v, max, height, topPad)]);
}

// Catmull-Rom to cubic-bezier conversion — turns sparse daily counts into a
// smooth curve instead of the sharp zigzag a straight-line polyline produces.
// Control points are clamped to the [0, maxHeight] plot area: Catmull-Rom
// control points can overshoot past a sharp peak/valley, and since the SVG
// has no overflow, an unclamped overshoot silently clips off-canvas — that's
// what flattened the tops of the curve instead of showing a smooth peak.
function smoothPath(points: [number, number][], maxHeight: number) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  const clampY = (y: number) => Math.max(0, Math.min(maxHeight, y));
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function formatDayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const RANGE_OPTIONS = [
  { value: "7", label: "7D" },
  { value: "14", label: "14D" },
  { value: "30", label: "30D" },
  { value: "60", label: "60D" },
  { value: "all", label: "ALL" },
] as const;
type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

const RANGE_TITLES: Record<RangeValue, string> = {
  "7": "7 days",
  "14": "14 days",
  "30": "30 days",
  "60": "60 days",
  all: "all time",
};

export default function AdminDashboard() {
  const { theme } = useAdminTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filter, setFilter] = useState<"all" | ActivityItem["type"]>("all");
  const [chartMode, setChartMode] = useState<"area" | "multiples">("area");
  const [range, setRange] = useState<RangeValue>("30");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const hasLoadedOnce = useRef(false);

  const tokens = DASH_TOKENS[theme];
  const STATUS_COLORS = theme === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const TYPE_META = theme === "dark" ? TYPE_META_DARK : TYPE_META_LIGHT;

  useEffect(() => {
    if (hasLoadedOnce.current) {
      setChartLoading(true);
    } else {
      setLoading(true);
    }
    fetch(`/api/admin/dashboard-stats?range=${range}`)
      .then((r) => r.json())
      .then((res) => {
        setStats(res.data ?? null);
        setChartLoading(false);
        hasLoadedOnce.current = true;
        setLoading(false);
      });
  }, [range]);

  const filteredActivity =
    stats?.recentActivity.filter((a) => filter === "all" || a.type === filter) ?? [];

  const statCards = stats
    ? [
        {
          label: "Consult requests",
          value: stats.totals.newConsultRequests,
          icon: Stethoscope,
          note: stats.totals.newConsultRequests > 0 ? "needs attention" : "none pending",
          critical: stats.totals.newConsultRequests > 0,
        },
        {
          label: "New inquiries",
          value: stats.totals.newInquiries,
          icon: Mail,
          note: stats.deltas.inquiriesThisWeek > 0 ? `+${stats.deltas.inquiriesThisWeek} this week` : "none this week",
          critical: false,
        },
        {
          label: "Products",
          value: stats.totals.totalProducts,
          icon: Package,
          note: "active catalog",
          critical: false,
        },
        {
          label: "Pending orders",
          value: stats.totals.pendingOrders,
          icon: Truck,
          note: stats.totals.pendingOrders > 0 ? "awaiting confirmation" : "flat",
          critical: false,
        },
        {
          label: "Total orders",
          value: stats.totals.totalOrders,
          icon: CheckCircle2,
          note: stats.deltas.ordersThisWeek > 0 ? `+${stats.deltas.ordersThisWeek} this week` : "flat",
          critical: false,
        },
      ]
    : [];

  return (
    <div
      className="cc-page"
      style={{
        ...(tokens as CSSProperties),
        background: "var(--cc-bg)",
        color: "var(--cc-ink-mid)",
        fontFamily: "-apple-system, 'Segoe UI', system-ui, Roboto, sans-serif",
        padding: "clamp(32px, 3vw, 56px) clamp(40px, 4vw, 72px) 96px",
        minHeight: "100%",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      <style>{`
        .cc-pulse { animation: cc-pulse 1.6s ease-in-out infinite; }
        @keyframes cc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (prefers-reduced-motion: reduce) {
          .cc-pulse { animation: none; }
        }
        .cc-scroll-x { -ms-overflow-style: none; scrollbar-width: none; }
        .cc-scroll-x::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .cc-page { padding: 24px 16px 60px !important; }
          .cc-kpi-card { padding: 16px 18px !important; }
          .cc-kpi-value { font-size: 28px !important; }
          .cc-panel { padding: 18px 16px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 2200, margin: "0 auto" }}>
      <p style={{ fontSize: "clamp(11px, 0.9vw, 13px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cc-teal)", margin: "0 0 9px" }}>
        Admin
      </p>
      <h1 style={{ fontFamily: "inherit", fontWeight: 600, fontSize: "clamp(30px, 2.6vw, 44px)", color: "var(--cc-ink)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
        Dashboard
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[clamp(260px,17vw,330px)_1fr] md:gap-6">
          <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-col md:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 128, borderRadius: 7, background: "var(--cc-surface)", border: "1px solid var(--cc-border-soft)" }} className="cc-pulse" />
            ))}
          </div>
          <div style={{ height: 600, borderRadius: 7, background: "var(--cc-surface)", border: "1px solid var(--cc-border-soft)" }} className="cc-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[clamp(260px,17vw,330px)_1fr] md:gap-6">
          {/* Stat rail */}
          <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-col md:gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`cc-kpi-card${card.critical ? " col-span-2 md:col-span-1" : ""}`}
                  style={{
                    background: card.critical
                      ? "linear-gradient(180deg, color-mix(in srgb, var(--cc-red) 8%, transparent), var(--cc-surface) 40%)"
                      : "var(--cc-surface)",
                    border: `1px solid ${card.critical ? "var(--cc-red)" : "var(--cc-border-soft)"}`,
                    borderRadius: 7,
                    padding: "26px 28px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: card.critical ? "var(--cc-red)" : "var(--cc-teal)" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cc-ink-faint)" }}>
                      {card.label}
                    </span>
                    <Icon size={20} color={card.critical ? "var(--cc-red)" : "var(--cc-ink-faint)"} />
                  </div>
                  <div className="cc-kpi-value" style={{ ...NUMERALS_BIG, fontSize: "clamp(38px, 3vw, 52px)", lineHeight: 1, fontWeight: 600, color: card.critical ? "var(--cc-red)" : "var(--cc-ink)" }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 10, color: card.critical ? "var(--cc-red)" : "var(--cc-ink-faint)" }}>
                    {card.critical ? `▲ ${card.note}` : card.note}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Trend chart */}
            <div className="cc-panel" style={{ background: "var(--cc-surface)", border: "1px solid var(--cc-border-soft)", borderRadius: 7, padding: "30px 32px" }}>
              <div style={{ fontSize: 14.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--cc-ink-mid)", marginBottom: 18, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span>
                  Graph Trend — {RANGE_TITLES[range]}
                  {chartLoading && <span style={{ color: "var(--cc-ink-faint)", textTransform: "none", letterSpacing: 0 }}> · updating…</span>}
                </span>
                <button
                  onClick={() => setChartMode(chartMode === "area" ? "multiples" : "area")}
                  aria-label={chartMode === "area" ? "Switch to grid view" : "Switch to area view"}
                  className="relative flex-shrink-0"
                  style={{ width: 124, height: 34, borderRadius: 18, background: "var(--cc-border-soft)", border: "1px solid var(--cc-border)" }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 15px",
                      fontSize: 10.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--cc-ink-faint)",
                      pointerEvents: "none",
                    }}
                  >
                    <span>Area</span>
                    <span>Grid</span>
                  </span>
                  <span
                    className="flex items-center justify-center transition-all duration-200"
                    style={{
                      position: "absolute",
                      top: 3,
                      left: chartMode === "area" ? 3 : 62,
                      width: 59,
                      height: 28,
                      borderRadius: 15,
                      background: "var(--cc-teal)",
                      color: "var(--cc-surface)",
                      fontSize: 10.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {chartMode === "area" ? "Area" : "Grid"}
                  </span>
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div className="cc-scroll-x" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRange(opt.value)}
                      style={{
                        fontSize: 10.5,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "5px 11px",
                        borderRadius: 4,
                        border: `1px solid ${range === opt.value ? "var(--cc-teal)" : "var(--cc-border)"}`,
                        background: range === opt.value ? "color-mix(in srgb, var(--cc-teal) 10%, transparent)" : "transparent",
                        color: range === opt.value ? "var(--cc-teal)" : "var(--cc-ink-faint)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {chartMode === "area" ? (
                  <span style={{ display: "flex", gap: 22, fontSize: 13, color: "var(--cc-ink-faint)" }}>
                    <Legend color="var(--cc-purple)" label="consults" />
                    <Legend color="var(--cc-blue)" label="inquiries" />
                    <Legend color="var(--cc-teal)" label="orders" />
                  </span>
                ) : (
                  <span />
                )}
              </div>

              {stats && chartMode === "area" && (
                <ActivityAreaChart series={stats.series} width={1000} height={320} />
              )}

              {stats && chartMode === "multiples" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
                  <MultiplesCell label="Consults" values={stats.series.consults} days={stats.series.days} color="var(--cc-purple)" />
                  <MultiplesCell label="Inquiries" values={stats.series.inquiries} days={stats.series.days} color="var(--cc-blue)" />
                  <MultiplesCell label="Orders" values={stats.series.orders} days={stats.series.days} color="var(--cc-teal)" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:gap-5.5">
              {/* Recent activity */}
              <div className="cc-panel" style={{ background: "var(--cc-surface)", border: "1px solid var(--cc-border-soft)", borderRadius: 7, padding: "28px 30px" }}>
                <div style={{ fontSize: 14.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--cc-ink-mid)", marginBottom: 20, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                  <span>Recent activity</span>
                  <div className="cc-scroll-x" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                    {(["all", "inquiry", "consult", "order"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                          fontSize: 12,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          padding: "6px 13px",
                          borderRadius: 4,
                          border: `1px solid ${filter === f ? "var(--cc-teal)" : "var(--cc-border)"}`,
                          background: filter === f ? "color-mix(in srgb, var(--cc-teal) 10%, transparent)" : "transparent",
                          color: filter === f ? "var(--cc-teal)" : "var(--cc-ink-faint)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          flexShrink: 0,
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredActivity.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", fontSize: 14.5, color: "var(--cc-ink-faint)" }}>
                    Nothing here yet
                  </div>
                ) : (
                  <>
                    {/* Desktop: table */}
                    <table className="hidden lg:table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
                      <thead>
                        <tr>
                          <th style={th} />
                          <th style={th}>Name</th>
                          <th style={th}>Type</th>
                          <th style={th}>Status</th>
                          <th style={th}>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivity.map((item) => {
                          const meta = TYPE_META[item.type];
                          const s = STATUS_COLORS[item.status] ?? STATUS_COLORS.CLOSED;
                          return (
                            <tr key={`${item.type}-${item.id}`}>
                              <td style={td}>
                                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: meta.dot }} />
                              </td>
                              <td style={{ ...td, color: "var(--cc-ink)" }}>{item.name}</td>
                              <td style={td}>{meta.label}</td>
                              <td style={td}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                    padding: "4px 10px",
                                    borderRadius: 4,
                                    border: `1px solid ${s.border}`,
                                    color: s.color,
                                    background: s.bg,
                                  }}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ ...td, ...NUMERALS_SMALL, color: "var(--cc-ink-faint)" }}>{timeAgo(item.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Mobile: stacked card list */}
                    <div className="lg:hidden">
                      {filteredActivity.map((item) => {
                        const meta = TYPE_META[item.type];
                        const s = STATUS_COLORS[item.status] ?? STATUS_COLORS.CLOSED;
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--cc-border-soft)" }}
                          >
                            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, color: "var(--cc-ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--cc-ink-faint)" }}>{meta.label}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  border: `1px solid ${s.border}`,
                                  color: s.color,
                                  background: s.bg,
                                }}
                              >
                                {item.status}
                              </span>
                              <span style={{ ...NUMERALS_SMALL, fontSize: 11, color: "var(--cc-ink-faint)" }}>{timeAgo(item.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Queue */}
              <div className="cc-panel" style={{ background: "var(--cc-surface)", border: "1px solid var(--cc-border-soft)", borderRadius: 7, padding: "28px 30px" }}>
                <div style={{ fontSize: 14.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--cc-ink-mid)", marginBottom: 20 }}>
                  Queue
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <QueueRow href="/admin/medical-history" label="Unreviewed consults" count={stats?.totals.newConsultRequests ?? 0} />
                  <QueueRow href="/admin/inquiries" label="Open inquiries" count={stats?.totals.newInquiries ?? 0} />
                  <QueueRow href="/admin/orders" label="Pending orders" count={stats?.totals.pendingOrders ?? 0} />
                  <a
                    href="/admin/products"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 14,
                      padding: "16px 18px",
                      border: "1px solid var(--cc-border)",
                      borderRadius: 6,
                      color: "var(--cc-ink-mid)",
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Plus size={16} /> Add product
                    </span>
                    <ArrowRight size={16} color="var(--cc-ink-faint)" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function ActivityAreaChart({ series, width, height }: { series: Series; width: number; height: number }) {
  const max = Math.max(...series.consults, ...series.inquiries, ...series.orders, 1);
  // Headroom above the tallest data point so Catmull-Rom overshoot on a sharp
  // peak has room to round off naturally instead of hitting the canvas edge
  // (which is what produced the flat-topped "cut" peaks before).
  const topPad = height * 0.14;

  const yTicks = max <= 5 ? Array.from({ length: max + 1 }, (_, i) => max - i) : [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(max * f));

  const xLabelCount = Math.min(10, series.days.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) => Math.round((i * (series.days.length - 1)) / (xLabelCount - 1)));

  return (
    <div style={{ display: "flex" }}>
      <div style={{ position: "relative", width: 28, height, flexShrink: 0 }}>
        {yTicks.map((tick) => (
          <span
            key={tick}
            style={{
              ...NUMERALS_SMALL,
              position: "absolute",
              top: `${(valueToY(tick, max, height, topPad) / height) * 100}%`,
              right: 8,
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "var(--cc-ink-faint)",
            }}
          >
            {tick}
          </span>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="dash-grad-purple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--cc-purple)", stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: "var(--cc-purple)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="dash-grad-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--cc-blue)", stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: "var(--cc-blue)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <line key={tick} x1={0} y1={valueToY(tick, max, height, topPad)} x2={width} y2={valueToY(tick, max, height, topPad)} stroke="var(--cc-border-soft)" />
          ))}
          <AreaSeries values={series.consults} max={max} width={width} height={height} topPad={topPad} color="var(--cc-purple)" gradientId="dash-grad-purple" />
          <AreaSeries values={series.inquiries} max={max} width={width} height={height} topPad={topPad} color="var(--cc-blue)" gradientId="dash-grad-blue" />
          <AreaSeries values={series.orders} max={max} width={width} height={height} topPad={topPad} color="var(--cc-teal)" />
        </svg>
        <div style={{ ...NUMERALS_SMALL, display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--cc-ink-faint)" }}>
          {xLabelIndices.map((i) => (
            <span key={i}>{formatDayLabel(series.days[i])}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AreaSeries({
  values,
  max,
  width,
  height,
  topPad,
  color,
  gradientId,
}: {
  values: number[];
  max: number;
  width: number;
  height: number;
  topPad: number;
  color: string;
  gradientId?: string;
}) {
  if (isAllZero(values)) {
    return <line x1={0} y1={height} x2={width} y2={height} stroke={color} strokeWidth={1.6} strokeDasharray="3 6" opacity={0.6} />;
  }
  const points = toScaledPoints(values, width, height, max, topPad);
  const path = smoothPath(points, height);
  const last = points[points.length - 1];
  return (
    <>
      {gradientId && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} stroke="none" />}
      <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} />
    </>
  );
}

function MultiplesCell({ label, values, days, color }: { label: string; values: number[]; days: string[]; color: string }) {
  const flat = isAllZero(values);
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(...values);
  const peakIndex = values.indexOf(peak);
  const cellWidth = 240;
  const cellHeight = 64;
  const points = flat ? null : toScaledPoints(values, cellWidth, cellHeight, peak || 1);

  return (
    <div style={{ border: "1px solid var(--cc-border-soft)", borderRadius: 6, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--cc-ink-faint)" }}>{label}</span>
        <span style={{ ...(flat ? {} : NUMERALS_BIG), fontSize: flat ? 15 : 22, color: flat ? "var(--cc-ink-faint)" : "var(--cc-ink)", fontWeight: flat ? 400 : 600 }}>
          {flat ? "flat" : total}
        </span>
      </div>
      <svg width="100%" height={cellHeight} viewBox={`0 0 ${cellWidth} ${cellHeight}`} preserveAspectRatio="none">
        {flat || !points ? (
          <line x1={0} y1={cellHeight / 2} x2={cellWidth} y2={cellHeight / 2} stroke={color} strokeWidth={1.6} strokeDasharray="3 6" opacity={0.6} />
        ) : (
          <>
            <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={2} />
            <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3} fill={color} />
          </>
        )}
      </svg>
      <div style={{ fontSize: 10.5, color: "var(--cc-ink-faint)", marginTop: 8 }}>
        {flat ? `0 for ${days.length} days straight` : `peak ${peak} · ${formatDayLabel(days[peakIndex])}`}
      </div>
    </div>
  );
}

function QueueRow({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 14,
        padding: "16px 18px",
        border: "1px solid var(--cc-border)",
        borderRadius: 6,
        color: "var(--cc-ink-mid)",
        textDecoration: "none",
      }}
    >
      <span>{label}</span>
      <span style={{ ...NUMERALS_SMALL, color: count > 0 ? "var(--cc-teal)" : "var(--cc-ink-faint)", fontWeight: 600 }}>{count}</span>
    </a>
  );
}

// Big, prominent stat figures (KPI cards, Grid-mode totals) use plain sans
// digits — a coding-monospace font's stylized zero was most noticeable at
// that size. Small secondary data (table timestamps, axis ticks, badges)
// keeps the monospace "data" treatment, where it reads as technical instead
// of odd. Both use tabular figures so columns still line up.
const NUMERALS_BIG: CSSProperties = {
  fontVariantNumeric: "tabular-nums",
};

const NUMERALS_SMALL: CSSProperties = {
  fontFamily: "ui-monospace, 'SFMono-Regular', 'Cascadia Code', Consolas, monospace",
  fontVariantNumeric: "tabular-nums",
};

const th: CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--cc-ink-faint)",
  fontWeight: "normal",
  padding: "0 15px 15px",
  borderBottom: "1px solid var(--cc-border)",
};

const td: CSSProperties = {
  padding: 15,
  borderBottom: "1px solid var(--cc-border-soft)",
  color: "var(--cc-ink-mid)",
};
