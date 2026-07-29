"use client";

import { useEffect, useState } from "react";

interface MedicalHistory {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  height: string | null;
  weight: string | null;
  waistCircumference: string | null;
  smokingStatus: string | null;
  drinkingFrequency: string | null;
  bmi: string | null;
  bmiCategory: string | null;
  mtc: string;
  pancreatitis: string;
  gallbladder: string;
  gi: string;
  diabetes: string;
  pregnant: string;
  surgeries: string | null;
  medications: string | null;
  allergies: string | null;
  consent1: boolean;
  consent2: boolean;
  consent3: boolean;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["NEW", "REVIEWED", "CONTACTED", "CLOSED"];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEW:       { bg: "#E3F2FD", color: "#1565C0" },
  REVIEWED:  { bg: "#F3E5F5", color: "#6A1B9A" },
  CONTACTED: { bg: "#E8F5E9", color: "#2E7D32" },
  CLOSED:    { bg: "#F5F5F5", color: "#616161" },
};

const MEDICAL_QUESTIONS: { key: keyof MedicalHistory; label: string }[] = [
  { key: "mtc", label: "Personal/family history of MTC or MEN 2" },
  { key: "pancreatitis", label: "History of pancreatitis" },
  { key: "gallbladder", label: "Gallbladder disease" },
  { key: "gi", label: "Gastrointestinal disease" },
  { key: "diabetes", label: "Diabetes" },
  { key: "pregnant", label: "Pregnant, breastfeeding, or planning to become pregnant" },
];

export default function AdminMedicalHistoryPage() {
  const [records, setRecords] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<MedicalHistory | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchRecords = () => {
    setLoading(true);
    const url =
      filterStatus === "ALL" ? "/api/medical-history?limit=50" : `/api/medical-history?status=${filterStatus}&limit=50`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        setRecords(json.data ?? []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchRecords(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await fetch("/api/medical-history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], status }),
    });
    setUpdating(false);
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status } : null));
    fetchRecords();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Consult Requests</h1>
        <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Manage Book a Consult (medical history) submissions.</p>
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
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>No consult requests found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {records.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelected(rec)}
                  className="px-5 py-4 cursor-pointer transition-colors duration-150"
                  style={{ background: selected?.id === rec.id ? "var(--teal-pale)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{rec.fullName}</div>
                    <span
                      className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] flex-shrink-0"
                      style={STATUS_COLORS[rec.status] ?? STATUS_COLORS.CLOSED}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="text-[11px] mb-1" style={{ color: "var(--teal)" }}>{rec.email || rec.phone || "—"}</div>
                  <div className="text-[12px] truncate" style={{ color: "var(--ink-faint)" }}>DOB {rec.dateOfBirth}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>
                    {new Date(rec.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
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
                <h2 className="font-display font-light text-[24px]" style={{ color: "var(--ink)" }}>{selected.fullName}</h2>
                <div className="text-[13px]" style={{ color: "var(--teal)" }}>{selected.email}</div>
                {selected.phone && <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>{selected.phone}</div>}
              </div>
              <span
                className="text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-[2px]"
                style={STATUS_COLORS[selected.status] ?? STATUS_COLORS.CLOSED}
              >
                {selected.status}
              </span>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Date of Birth</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.dateOfBirth}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Gender</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.gender}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Height / Weight</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>
                  {selected.height || "—"} / {selected.weight || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>BMI</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>
                  {selected.bmi ? `${selected.bmi} (${selected.bmiCategory})` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Smoking</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.smokingStatus || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Drinking</div>
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>{selected.drinkingFrequency || "—"}</div>
              </div>
            </div>

            {/* Medical history Q&A */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Medical History</div>
              <div className="flex flex-col gap-2">
                {MEDICAL_QUESTIONS.map((q) => (
                  <div key={q.key} className="flex items-center justify-between gap-3 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    <span>{q.label}</span>
                    <span
                      className="text-[10px] uppercase font-semibold flex-shrink-0"
                      style={{ color: selected[q.key] === "Yes" ? "#C62828" : "var(--ink-faint)" }}
                    >
                      {String(selected[q.key]) || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(selected.surgeries || selected.medications || selected.allergies) && (
              <div className="flex flex-col gap-3">
                {selected.surgeries && (
                  <div>
                    <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Surgeries</div>
                    <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{selected.surgeries}</p>
                  </div>
                )}
                {selected.medications && (
                  <div>
                    <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Medications</div>
                    <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{selected.medications}</p>
                  </div>
                )}
                {selected.allergies && (
                  <div>
                    <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Allergies</div>
                    <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{selected.allergies}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Received</div>
              <div className="text-[13px]" style={{ color: "var(--ink)" }}>{new Date(selected.createdAt).toLocaleString("en-PH")}</div>
            </div>

            {/* Update status */}
            <div>
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Update status</div>
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
            <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Select a consult request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
