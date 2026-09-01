"use client";

import { Suspense, useCallback, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Gift, Mail, PhoneCall } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { formatReferenceNumber } from "@/lib/reference-number";
import { useAdminTheme, type AdminTheme } from "@/contexts/AdminThemeContext";

interface DoctorNote {
  id: string;
  type: "TEXT" | "PHOTO";
  content: string | null;
  imageUrl: string | null;
  publicId: string | null;
  createdAt: string;
}

interface MedicalHistory {
  id: string;
  sequence: number;
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
  doctorNotes: DoctorNote[];
}

const STATUS_OPTIONS = ["NEW", "REVIEWED", "CONTACTED", "CLOSED"];

type StatusStyle = { bg: string; color: string };

const STATUS_COLORS_LIGHT: Record<string, StatusStyle> = {
  NEW:       { bg: "#E3F2FD", color: "#1565C0" },
  REVIEWED:  { bg: "#F3E5F5", color: "#6A1B9A" },
  CONTACTED: { bg: "#E8F5E9", color: "#2E7D32" },
  CLOSED:    { bg: "#F5F5F5", color: "#616161" },
};

const STATUS_COLORS_DARK: Record<string, StatusStyle> = {
  NEW:       { bg: "rgba(95,180,232,0.12)",  color: "#5FB4E8" },
  REVIEWED:  { bg: "rgba(196,140,240,0.12)", color: "#C48CF0" },
  CONTACTED: { bg: "rgba(63,217,174,0.12)",  color: "#3FD9AE" },
  CLOSED:    { bg: "rgba(148,163,153,0.12)", color: "#94A399" },
};

const MH_TOKENS: Record<AdminTheme, Record<string, string>> = {
  light: {
    "--mh-bg": "#F7F9F8",
    "--mh-surface": "#FFFFFF",
    "--mh-surface-alt": "#F7F9F8",
    "--mh-border": "rgba(0,0,0,0.06)",
    "--mh-border-soft": "rgba(0,0,0,0.05)",
    "--mh-ink": "#0D1512",
    "--mh-ink-muted": "#4A5754",
    "--mh-ink-faint": "#8FA39D",
    "--mh-teal": "#2E8B72",
    "--mh-teal-dark": "#1D6B57",
    "--mh-teal-pale": "#EAF5F2",
    "--mh-danger": "#C62828",
  },
  dark: {
    "--mh-bg": "#0A0F0E",
    "--mh-surface": "#0F1614",
    "--mh-surface-alt": "#161F1B",
    "--mh-border": "#22302B",
    "--mh-border-soft": "#1A2521",
    "--mh-ink": "#EAF2EF",
    "--mh-ink-muted": "#B7C6C1",
    "--mh-ink-faint": "#5C716A",
    "--mh-teal": "#3FD9AE",
    "--mh-teal-dark": "#3FD9AE",
    "--mh-teal-pale": "rgba(63,217,174,0.12)",
    "--mh-danger": "#E0736C",
  },
};

function calculateAge(dob: string): number | null {
  const [month, day, year] = dob.split("/").map(Number);
  if (!month || !day || !year) return null;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function formatHeightFeet(heightCm: string | null): string | null {
  if (!heightCm) return null;
  const cm = parseFloat(heightCm);
  if (Number.isNaN(cm)) return null;
  const totalInches = Math.round(cm / 2.54);
  let feet = Math.floor(totalInches / 12);
  let inches = totalInches % 12;
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${feet}'${inches}"`;
}

// Philippine mobile numbers are typically entered without the leading 0
// (e.g. copied from a "+63 906..." field) — restore it for the local format.
function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  return /^\d{10}$/.test(phone) ? `0${phone}` : phone;
}

// The "×" glyph renders off-center in circular close buttons across fonts —
// an SVG centers reliably regardless of font metrics.
function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const MEDICAL_QUESTIONS: { key: keyof MedicalHistory; label: string }[] = [
  { key: "mtc", label: "Personal/family history of MTC or MEN 2" },
  { key: "pancreatitis", label: "History of pancreatitis" },
  { key: "gallbladder", label: "Gallbladder disease" },
  { key: "gi", label: "Gastrointestinal disease" },
  { key: "diabetes", label: "Diabetes" },
  { key: "pregnant", label: "Pregnant, breastfeeding, or planning to become pregnant" },
];

export default function AdminMedicalHistoryPage() {
  return (
    <Suspense fallback={null}>
      <AdminMedicalHistoryPageContent />
    </Suspense>
  );
}

function AdminMedicalHistoryPageContent() {
  const searchParams = useSearchParams();
  const { theme } = useAdminTheme();
  const tokens = MH_TOKENS[theme];
  const STATUS_COLORS = theme === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  const [records, setRecords] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<MedicalHistory | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteMode, setNoteMode] = useState<"write" | "photo">("write");
  const [noteText, setNoteText] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500);
    });
  }, []);

  const fetchRecords = useCallback(() => {
    const url =
      filterStatus === "ALL"
        ? `/api/medical-history?limit=${PAGE_SIZE}&page=${page}`
        : `/api/medical-history?status=${filterStatus}&limit=${PAGE_SIZE}&page=${page}`;
    Promise.resolve()
      .then(() => setLoading(true))
      .then(() => fetch(url))
      .then((r) => r.json())
      .then((json) => {
        setRecords(json.data ?? []);
        setTotalPages(json.meta?.totalPages ?? 1);
        setLoading(false);
      });
  }, [filterStatus, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/medical-history/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setSelected(json.data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!noteModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNoteModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [noteModalOpen]);

  useEffect(() => {
    if (!viewingImage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewingImage]);

  const selectRecord = (rec: MedicalHistory | null) => {
    setSelected(rec);
    setConfirmingDelete(false);
  };

  const openNoteModal = () => {
    setNoteMode("write");
    setNoteText("");
    setPhotoError(null);
    setNoteModalOpen(true);
  };

  const addNote = async (body: Record<string, unknown>) => {
    if (!selected) return;
    setSavingNote(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/medical-history/${selected.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json?.data) {
        setSelected((prev) => (prev ? { ...prev, doctorNotes: [json.data, ...prev.doctorNotes] } : null));
        setNoteModalOpen(false);
        setNoteText("");
      }
    } catch {
      setActionError("Couldn't save the note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!selected) return;
    setDeletingNoteId(noteId);
    setActionError(null);
    try {
      const res = await fetch(`/api/medical-history/${selected.id}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error ?? "Couldn't delete the note. Please try again.");
        return;
      }
      setSelected((prev) => (prev ? { ...prev, doctorNotes: prev.doctorNotes.filter((n) => n.id !== noteId) } : null));
    } catch {
      setActionError("Couldn't delete the note. Please try again.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const startEditNote = (note: DoctorNote) => {
    setEditingNoteId(note.id);
    setEditText(note.content ?? "");
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const saveEditNote = async (noteId: string) => {
    if (!selected) return;
    setSavingEdit(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/medical-history/${selected.id}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText }),
      });
      const json = await res.json();
      if (json?.data) {
        setSelected((prev) =>
          prev ? { ...prev, doctorNotes: prev.doctorNotes.map((n) => (n.id === noteId ? json.data : n)) } : null
        );
        setEditingNoteId(null);
        setEditText("");
      }
    } catch {
      setActionError("Couldn't save the note. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/medical-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error ?? "Couldn't update the status. Please try again.");
        return;
      }
      if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status } : null));
      fetchRecords();
    } catch {
      setActionError("Couldn't update the status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const deleteRecord = async (id: string) => {
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/medical-history?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error ?? "Couldn't delete the request. Please try again.");
        return;
      }
      setConfirmingDelete(false);
      if (selected?.id === id) setSelected(null);
      fetchRecords();
    } catch {
      setActionError("Couldn't delete the request. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 mh-root" data-mh-theme={theme} style={{ ...(tokens as CSSProperties), background: "var(--mh-bg)", transition: "background 0.15s ease" }}>
      <style>{`
        .mh-root[data-mh-theme="dark"] .note-modal {
          background: var(--mh-surface);
          border-color: var(--mh-border);
          box-shadow: 0 30px 60px -20px rgba(0,0,0,0.6);
        }
        .mh-root[data-mh-theme="dark"] .note-backdrop {
          background: rgba(0,0,0,0.55);
        }
        .mh-root[data-mh-theme="dark"] .note-modal-close {
          background: rgba(255,255,255,0.08);
          color: var(--mh-ink-muted);
        }
        .mh-root[data-mh-theme="dark"] .note-modal-close:hover {
          background: rgba(255,255,255,0.14);
          color: var(--mh-ink);
        }
        .mh-root[data-mh-theme="dark"] .note-mode-tab {
          border-color: var(--mh-border);
          color: var(--mh-ink-muted);
        }
        .mh-root[data-mh-theme="dark"] .note-mode-tab.active {
          background: var(--mh-teal);
          border-color: var(--mh-teal);
          color: #0A0F0E;
        }
        .mh-lightbox-backdrop { animation: mh-lightbox-fade 0.15s ease; }
        @keyframes mh-lightbox-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .mh-lightbox-backdrop { animation: none; }
        }
      `}</style>
      <div className="mb-6">
        <h1 className="font-display font-light text-[32px]" style={{ color: "var(--mh-ink)" }}>Consult Requests</h1>
        <p className="text-[13px]" style={{ color: "var(--mh-ink-faint)" }}>Manage Book a Consult (medical history) submissions.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className="text-[11px] tracking-[0.06em] uppercase px-4 py-2 rounded-full border transition-all duration-200"
            style={{
              background: filterStatus === s ? "var(--mh-teal-dark)" : "var(--mh-surface)",
              color: filterStatus === s ? (theme === "dark" ? "#0A0F0E" : "white") : "var(--mh-ink-muted)",
              borderColor: filterStatus === s ? "var(--mh-teal-dark)" : "var(--mh-border)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List — hidden on mobile once a record is selected, so the detail view gets the full screen */}
        <div
          className={`${selected ? "hidden lg:block" : "block"} rounded-[10px] overflow-hidden`}
          style={{ background: "var(--mh-surface)", border: "1px solid var(--mh-border)" }}
        >
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded animate-pulse" style={{ background: "var(--mh-border-soft)" }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: "var(--mh-ink-faint)" }}>No consult requests found</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--mh-border-soft)" }}>
              {records.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => selectRecord(rec)}
                  className="px-5 py-4 cursor-pointer transition-colors duration-150"
                  style={{ background: selected?.id === rec.id ? "var(--mh-teal-pale)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-display text-[15px]" style={{ color: "var(--mh-ink)" }}>{rec.fullName}</div>
                    <span
                      className="text-[9px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-full flex-shrink-0"
                      style={STATUS_COLORS[rec.status] ?? STATUS_COLORS.CLOSED}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="text-[11px] mb-1" style={{ color: "var(--mh-teal-dark)" }}>{rec.email || formatPhone(rec.phone) || "—"}</div>
                  <div className="text-[12px] truncate" style={{ color: "var(--mh-ink-faint)" }}>
                    {calculateAge(rec.dateOfBirth) ?? "—"} / {rec.gender || "—"}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] font-mono" style={{ color: "var(--mh-ink-faint)" }}>
                      {formatReferenceNumber(rec.sequence, new Date(rec.createdAt))}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--mh-ink-faint)" }}>
                      {new Date(rec.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: "var(--mh-border-soft)" }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-[11px] font-medium"
                style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <div className="text-[11px]" style={{ color: "var(--mh-ink-faint)" }}>
                Page {page} of {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-[11px] font-medium"
                style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="rounded-[10px] flex flex-col overflow-hidden" style={{ background: "var(--mh-surface)", border: "1px solid var(--mh-border)" }}>
            <div className="p-6 pb-0 flex flex-col gap-5">
              <button
                type="button"
                onClick={() => selectRecord(null)}
                className="lg:hidden text-[12px] font-medium self-start"
                style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: "pointer" }}
              >
                ← Back to list
              </button>
              {actionError && (
                <p className="text-[12px]" style={{ color: "var(--mh-danger)" }}>{actionError}</p>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display font-light text-[24px]" style={{ color: "var(--mh-ink)" }}>{selected.fullName}</h2>
                  <div className="text-[11px] mb-3" style={{ color: "var(--mh-ink-faint)" }}>
                    {formatReferenceNumber(selected.sequence, new Date(selected.createdAt))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.email && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selected.email!, "email")}
                        title="Click to copy"
                        className="text-[11.5px] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                        style={{ background: "var(--mh-teal-pale)", color: "var(--mh-teal-dark)", border: "none", cursor: "pointer" }}
                      >
                        {copiedField === "email" ? (<><Check size={13} /> Copied!</>) : (<><Mail size={13} /> {selected.email}</>)}
                      </button>
                    )}
                    {selected.phone && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(formatPhone(selected.phone)!, "phone")}
                        title="Click to copy"
                        className="text-[11.5px] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                        style={{ background: "var(--mh-teal-pale)", color: "var(--mh-teal-dark)", border: "none", cursor: "pointer" }}
                      >
                        {copiedField === "phone" ? (<><Check size={13} /> Copied!</>) : (<><PhoneCall size={13} /> {formatPhone(selected.phone)}</>)}
                      </button>
                    )}
                    <span
                      className="text-[11.5px] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                      style={{ background: "var(--mh-teal-pale)", color: "var(--mh-teal-dark)" }}
                    >
                      <Gift size={13} /> {selected.dateOfBirth}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[10px] tracking-[0.08em] uppercase px-3 py-1 rounded-full flex-shrink-0"
                  style={STATUS_COLORS[selected.status] ?? STATUS_COLORS.CLOSED}
                >
                  {selected.status}
                </span>
              </div>
            </div>

            {/* Vitals strip — desktop: 4 cells, each pairing two values */}
            <div className="hidden md:flex mt-5" style={{ background: "var(--mh-surface-alt)", borderTop: "1px solid var(--mh-border)", borderBottom: "1px solid var(--mh-border)" }}>
              <div className="flex-1 px-4 py-3" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[9px] tracking-[0.08em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Age / Gender</div>
                <div className="font-display text-[16px]" style={{ color: "var(--mh-ink)" }}>
                  {calculateAge(selected.dateOfBirth) ?? "—"} / {selected.gender || "—"}
                </div>
              </div>
              <div className="flex-1 px-4 py-3" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[9px] tracking-[0.08em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Height / Weight</div>
                <div className="font-display text-[16px]" style={{ color: "var(--mh-ink)" }}>
                  {formatHeightFeet(selected.height) ?? "—"} / {selected.weight ? `${selected.weight} kg` : "—"}
                </div>
              </div>
              <div className="flex-1 px-4 py-3" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[9px] tracking-[0.08em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>BMI</div>
                <div
                  className="font-display text-[16px]"
                  style={{ color: selected.bmiCategory?.toLowerCase().includes("obese") ? "var(--mh-danger)" : "var(--mh-ink)" }}
                >
                  {selected.bmi ? `${selected.bmi} · ${selected.bmiCategory}` : "—"}
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="text-[9px] tracking-[0.08em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Smoking / Drinking</div>
                <div className="font-display text-[16px]" style={{ color: "var(--mh-ink)" }}>
                  {selected.smokingStatus || "—"} · {selected.drinkingFrequency || "—"}
                </div>
              </div>
            </div>

            {/* Vitals strip — mobile: 4x2 grid, one value per cell */}
            <div className="grid grid-cols-4 md:hidden mt-5" style={{ background: "var(--mh-surface-alt)", borderTop: "1px solid var(--mh-border)", borderBottom: "1px solid var(--mh-border)" }}>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)", borderBottom: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Age</div>
                <div className="font-display text-[14px]" style={{ color: "var(--mh-ink)" }}>{calculateAge(selected.dateOfBirth) ?? "—"}</div>
              </div>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)", borderBottom: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Height</div>
                <div className="font-display text-[14px]" style={{ color: "var(--mh-ink)" }}>{formatHeightFeet(selected.height) ?? "—"}</div>
              </div>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)", borderBottom: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>BMI</div>
                <div
                  className="font-display text-[14px]"
                  style={{ color: selected.bmiCategory?.toLowerCase().includes("obese") ? "var(--mh-danger)" : "var(--mh-ink)" }}
                >
                  {selected.bmi || "—"}
                </div>
              </div>
              <div className="px-2 py-2.5" style={{ borderBottom: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Smoking</div>
                <div className="text-[12.5px]" style={{ color: "var(--mh-ink)" }}>{selected.smokingStatus || "—"}</div>
              </div>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Gender</div>
                <div className="font-display text-[14px]" style={{ color: "var(--mh-ink)" }}>{selected.gender || "—"}</div>
              </div>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Weight</div>
                <div className="font-display text-[14px]" style={{ color: "var(--mh-ink)" }}>{selected.weight ? `${selected.weight} kg` : "—"}</div>
              </div>
              <div className="px-2 py-2.5" style={{ borderRight: "1px solid var(--mh-border)" }}>
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Classification</div>
                <div
                  className="text-[12px]"
                  style={{ color: selected.bmiCategory?.toLowerCase().includes("obese") ? "var(--mh-danger)" : "var(--mh-ink)" }}
                >
                  {selected.bmiCategory || "—"}
                </div>
              </div>
              <div className="px-2 py-2.5">
                <div className="text-[8px] tracking-[0.06em] uppercase mb-1 truncate" style={{ color: "var(--mh-ink-faint)" }}>Drinking</div>
                <div className="text-[12.5px]" style={{ color: "var(--mh-ink)" }}>{selected.drinkingFrequency || "—"}</div>
              </div>
            </div>

            <div className="p-6 pt-5 flex flex-col gap-5">
              {/* Medical history Q&A */}
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--mh-ink-faint)" }}>Medical History</div>
                <div className="flex flex-col">
                  {MEDICAL_QUESTIONS.map((q) => (
                    <div
                      key={q.key}
                      className="flex items-center justify-between gap-3 text-[13px] py-2"
                      style={{ color: "var(--mh-ink-muted)", borderBottom: "1px dotted var(--mh-border)" }}
                    >
                      <span>{q.label}</span>
                      <span
                        className="text-[10px] uppercase font-semibold flex-shrink-0"
                        style={{ color: selected[q.key] === "Yes" ? "var(--mh-danger)" : "var(--mh-ink-faint)" }}
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
                      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Surgeries</div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: "var(--mh-ink-muted)", whiteSpace: "pre-line" }}>{selected.surgeries}</p>
                    </div>
                  )}
                  {selected.medications && (
                    <div>
                      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Medications</div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: "var(--mh-ink-muted)", whiteSpace: "pre-line" }}>{selected.medications}</p>
                    </div>
                  )}
                  {selected.allergies && (
                    <div>
                      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "var(--mh-ink-faint)" }}>Allergies</div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: "var(--mh-ink-muted)" }}>{selected.allergies}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--mh-ink-faint)" }}>Received</div>
                <div className="text-[13px]" style={{ color: "var(--mh-ink)" }}>{new Date(selected.createdAt).toLocaleString("en-PH")}</div>
              </div>

              {/* Doctor's Notes */}
              <div className="pt-2 border-t" style={{ borderColor: "var(--mh-border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--mh-ink-faint)" }}>Doctor&apos;s Notes</div>
                  <button
                    type="button"
                    onClick={openNoteModal}
                    className="text-[11px] font-medium"
                    style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: "pointer" }}
                  >
                    + Add note
                  </button>
                </div>
                {selected.doctorNotes.length === 0 ? (
                  <p className="text-[12px]" style={{ color: "var(--mh-ink-faint)" }}>No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selected.doctorNotes.map((note) => (
                      <div key={note.id} className="flex items-start justify-between gap-3 p-3 rounded-[6px]" style={{ background: "var(--mh-surface-alt)" }}>
                        <div className="flex-1 min-w-0">
                          {editingNoteId === note.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                className="w-full text-[13px] leading-[1.6] rounded-[4px] p-2"
                                style={{ color: "var(--mh-ink)", border: "1px solid var(--mh-border)", background: "var(--mh-surface)" }}
                              />
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => saveEditNote(note.id)}
                                  disabled={savingEdit || !editText.trim()}
                                  className="text-[10px] font-medium"
                                  style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: savingEdit ? "not-allowed" : "pointer", opacity: savingEdit || !editText.trim() ? 0.6 : 1 }}
                                >
                                  {savingEdit ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditNote}
                                  disabled={savingEdit}
                                  className="text-[10px] font-medium"
                                  style={{ background: "none", border: "none", padding: 0, color: "var(--mh-ink-faint)", cursor: savingEdit ? "not-allowed" : "pointer" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : note.type === "TEXT" ? (
                            <p className="text-[13px] leading-[1.6] whitespace-pre-wrap" style={{ color: "var(--mh-ink-muted)" }}>{note.content}</p>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={note.imageUrl ?? ""}
                              alt="Doctor's note"
                              className="rounded-[4px] max-h-[220px] transition-opacity duration-150 hover:opacity-85"
                              style={{ cursor: "zoom-in" }}
                              onClick={() => note.imageUrl && setViewingImage(note.imageUrl)}
                            />
                          )}
                          {editingNoteId !== note.id && (
                            <div className="text-[10px] mt-1" style={{ color: "var(--mh-ink-faint)" }}>
                              {new Date(note.createdAt).toLocaleString("en-PH")}
                            </div>
                          )}
                        </div>
                        {editingNoteId !== note.id && (
                          <div className="flex gap-3 flex-shrink-0">
                            {note.type === "TEXT" && (
                              <button
                                type="button"
                                onClick={() => startEditNote(note)}
                                className="text-[10px] font-medium"
                                style={{ background: "none", border: "none", padding: 0, color: "var(--mh-teal)", cursor: "pointer" }}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteNote(note.id)}
                              disabled={deletingNoteId === note.id}
                              className="text-[10px] font-medium"
                              style={{ background: "none", border: "none", padding: 0, color: "var(--mh-danger)", cursor: deletingNoteId === note.id ? "not-allowed" : "pointer", opacity: deletingNoteId === note.id ? 0.6 : 1 }}
                            >
                              {deletingNoteId === note.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Update status */}
              <div>
                <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--mh-ink-faint)" }}>Update status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={updating || selected.status === s}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-full border transition-all duration-200"
                      style={{
                        background: selected.status === s ? "var(--mh-teal-dark)" : "transparent",
                        color: selected.status === s ? (theme === "dark" ? "#0A0F0E" : "white") : "var(--mh-ink-muted)",
                        borderColor: selected.status === s ? "var(--mh-teal-dark)" : "var(--mh-border)",
                        opacity: updating ? 0.6 : 1,
                        cursor: updating || selected.status === s ? "not-allowed" : "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <div className="pt-2 border-t" style={{ borderColor: "var(--mh-border)" }}>
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]" style={{ color: "var(--mh-ink-muted)" }}>Delete this request permanently?</span>
                    <button
                      onClick={() => deleteRecord(selected.id)}
                      disabled={deleting}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-full text-white"
                      style={{ background: "var(--mh-danger)", opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-full border"
                      style={{ borderColor: "var(--mh-border)", color: "var(--mh-ink-muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="text-[11px] font-medium"
                    style={{ background: "none", border: "none", padding: 0, color: "var(--mh-danger)", cursor: "pointer" }}
                  >
                    Delete request
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="hidden lg:flex rounded-[8px] items-center justify-center"
            style={{ background: "var(--mh-surface)", border: "1px solid var(--mh-border)", minHeight: 300 }}
          >
            <p className="text-[13px]" style={{ color: "var(--mh-ink-faint)" }}>Select a consult request to view details</p>
          </div>
        )}
      </div>

      {/* Add note modal */}
      <div className={`note-backdrop${noteModalOpen ? " open" : ""}`} onClick={() => setNoteModalOpen(false)} />
      <div className={`note-modal${noteModalOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="note-modal-heading">
        <button type="button" onClick={() => setNoteModalOpen(false)} className="note-modal-close" aria-label="Close"><CloseIcon size={15} /></button>
        <h3 id="note-modal-heading" className="font-display font-light text-[20px] mb-4" style={{ color: "var(--mh-ink)" }}>
          Add a doctor&apos;s note
        </h3>
        <div className="note-mode-tabs mb-4">
          <button type="button" onClick={() => setNoteMode("write")} className={`note-mode-tab${noteMode === "write" ? " active" : ""}`}>Write</button>
          <button type="button" onClick={() => { setNoteMode("photo"); setPhotoError(null); }} className={`note-mode-tab${noteMode === "photo" ? " active" : ""}`}>Upload photo</button>
        </div>

        {noteMode === "write" ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note…"
              rows={6}
              className="w-full text-[13px] p-3 rounded-[6px] border resize-none"
              style={{ borderColor: "var(--mh-border)", color: "var(--mh-ink)", background: "var(--mh-surface)" }}
            />
            <button
              type="button"
              onClick={() => addNote({ type: "TEXT", content: noteText })}
              disabled={savingNote || !noteText.trim()}
              className="text-[11px] tracking-[0.06em] uppercase px-4 py-3 rounded-[4px] self-end text-white"
              style={{ background: "var(--mh-teal)", color: theme === "dark" ? "#0A0F0E" : "#fff", opacity: savingNote || !noteText.trim() ? 0.6 : 1, cursor: savingNote || !noteText.trim() ? "not-allowed" : "pointer" }}
            >
              {savingNote ? "Saving…" : "Save note"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12px]" style={{ color: "var(--mh-ink-faint)" }}>
              Snap or select a photo of the physical note — it uploads directly and attaches to this record.
            </p>
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              options={{ folder: "doctor-notes", sources: ["local", "camera"], multiple: false }}
              onSuccess={(result) => {
                const info = typeof result.info === "object" ? result.info : undefined;
                if (info?.secure_url && info?.public_id) {
                  addNote({ type: "PHOTO", imageUrl: info.secure_url, publicId: info.public_id });
                }
              }}
              onError={() => {
                setPhotoError(
                  "The photo upload tool couldn't load. If you're on Brave, try turning Shields off for this site, then retry — otherwise check your connection."
                );
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      setPhotoError(null);
                      open();
                    } catch {
                      setPhotoError(
                        "Couldn't open the photo picker. If you're on Brave, try turning Shields off for this site, then retry."
                      );
                    }
                  }}
                  disabled={savingNote}
                  className="text-[11px] tracking-[0.06em] uppercase px-4 py-3 rounded-[4px] self-start text-white"
                  style={{ background: "var(--mh-teal)", color: theme === "dark" ? "#0A0F0E" : "#fff", opacity: savingNote ? 0.6 : 1, cursor: savingNote ? "not-allowed" : "pointer" }}
                >
                  {savingNote ? "Saving…" : "Choose photo"}
                </button>
              )}
            </CldUploadWidget>
            {photoError && (
              <p className="text-[12px]" style={{ color: "var(--mh-danger)" }}>{photoError}</p>
            )}
          </div>
        )}
      </div>

      {/* Photo note lightbox */}
      {viewingImage && (
        <div
          className="mh-lightbox-backdrop"
          onClick={() => setViewingImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Doctor's note photo, full size"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={() => setViewingImage(null)}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <CloseIcon size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewingImage}
            alt="Doctor's note (full size)"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              borderRadius: 8,
              cursor: "default",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </div>
  );
}
