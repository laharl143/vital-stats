"use client";

import { useEffect, useState } from "react";

interface Inquiry {
  id: string;
  name: string;
  contactInfo: string;
  message: string;
  type: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["NEW", "READ", "RESPONDED", "CLOSED"];
const TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  PRODUCT_AVAILABILITY: "Product availability",
  PROGRAM_GUIDANCE: "Program guidance",
  ORDER_INQUIRY: "Order inquiry",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEW:       { bg: "#E3F2FD", color: "#1565C0" },
  READ:      { bg: "#F3E5F5", color: "#6A1B9A" },
  RESPONDED: { bg: "#E8F5E9", color: "#2E7D32" },
  CLOSED:    { bg: "#F5F5F5", color: "#616161" },
};

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchInquiries = () => {
    setLoading(true);
    const url = filterStatus === "ALL" ? "/api/inquiries?limit=50" : `/api/inquiries?status=${filterStatus}&limit=50`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => { setInquiries(json.data ?? []); setLoading(false); });
  };

  useEffect(() => { fetchInquiries(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], status }),
    });
    setUpdating(false);
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    fetchInquiries();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Inquiries</h1>
        <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Manage all contact form submissions.</p>
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
            {s}
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
          ) : inquiries.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>No inquiries found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  onClick={() => setSelected(inq)}
                  className="px-5 py-4 cursor-pointer transition-colors duration-150"
                  style={{
                    background: selected?.id === inq.id ? "var(--teal-pale)" : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{inq.name}</div>
                    <span
                      className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0"
                      style={STATUS_COLORS[inq.status] ?? STATUS_COLORS.CLOSED}
                    >
                      {inq.status}
                    </span>
                  </div>
                  <div className="text-[11px] mb-1" style={{ color: "var(--teal)" }}>{inq.contactInfo}</div>
                  <div className="text-[12px] truncate" style={{ color: "var(--ink-faint)" }}>{inq.message}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>
                    {new Date(inq.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="rounded-[8px] p-6 flex flex-col gap-5" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display font-light text-[24px]" style={{ color: "var(--ink)" }}>{selected.name}</h2>
                <a href={`https://facebook.com/${selected.contactInfo}`} className="text-[13px]" style={{ color: "var(--teal)" }}>
                  {selected.contactInfo}
                </a>
              </div>
              <span
                className="text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-[2px]"
                style={STATUS_COLORS[selected.status] ?? STATUS_COLORS.CLOSED}
              >
                {selected.status}
              </span>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Type</div>
              <div className="text-[13px]" style={{ color: "var(--ink)" }}>{TYPE_LABELS[selected.type] ?? selected.type}</div>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Message</div>
              <p className="text-[13px] leading-[1.7]" style={{ color: "var(--ink-muted)" }}>{selected.message}</p>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>
                Received
              </div>
              <div className="text-[13px]" style={{ color: "var(--ink)" }}>
                {new Date(selected.createdAt).toLocaleString("en-PH")}
              </div>
            </div>

            {/* Update status */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>
                Update status
              </div>
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
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-[8px] flex items-center justify-center"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", minHeight: 300 }}
          >
            <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Select an inquiry to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
