"use client";

import { useEffect, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { formatReferenceNumber } from "@/lib/reference-number";

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
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteMode, setNoteMode] = useState<"write" | "photo">("write");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

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

  const selectRecord = (rec: MedicalHistory | null) => {
    setSelected(rec);
    setConfirmingDelete(false);
  };

  const openNoteModal = () => {
    setNoteMode("write");
    setNoteText("");
    setNoteModalOpen(true);
  };

  const addNote = async (body: Record<string, unknown>) => {
    if (!selected) return;
    setSavingNote(true);
    const res = await fetch(`/api/medical-history/${selected.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSavingNote(false);
    if (json?.data) {
      setSelected((prev) => (prev ? { ...prev, doctorNotes: [json.data, ...prev.doctorNotes] } : null));
      setNoteModalOpen(false);
      setNoteText("");
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!selected) return;
    setDeletingNoteId(noteId);
    await fetch(`/api/medical-history/${selected.id}/notes/${noteId}`, { method: "DELETE" });
    setDeletingNoteId(null);
    setSelected((prev) => (prev ? { ...prev, doctorNotes: prev.doctorNotes.filter((n) => n.id !== noteId) } : null));
  };

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

  const deleteRecord = async (id: string) => {
    setDeleting(true);
    await fetch(`/api/medical-history?id=${id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmingDelete(false);
    if (selected?.id === id) setSelected(null);
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
        {/* List — hidden on mobile once a record is selected, so the detail view gets the full screen */}
        <div
          className={`${selected ? "hidden lg:block" : "block"} rounded-[8px] overflow-hidden`}
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
        >
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
                  onClick={() => selectRecord(rec)}
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] font-mono" style={{ color: "var(--ink-faint)" }}>
                      {formatReferenceNumber(rec.sequence, new Date(rec.createdAt))}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--ink-faint)" }}>
                      {new Date(rec.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="rounded-[8px] p-6 flex flex-col gap-5" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              type="button"
              onClick={() => selectRecord(null)}
              className="lg:hidden text-[12px] font-medium self-start"
              style={{ background: "none", border: "none", padding: 0, color: "var(--teal)", cursor: "pointer" }}
            >
              ← Back to list
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display font-light text-[24px]" style={{ color: "var(--ink)" }}>{selected.fullName}</h2>
                <div className="text-[11px] font-mono mb-1" style={{ color: "var(--ink-faint)" }}>
                  {formatReferenceNumber(selected.sequence, new Date(selected.createdAt))}
                </div>
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

            {/* Doctor's Notes */}
            <div className="pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-faint)" }}>Doctor&apos;s Notes</div>
                <button
                  type="button"
                  onClick={openNoteModal}
                  className="text-[11px] font-medium"
                  style={{ background: "none", border: "none", padding: 0, color: "var(--teal)", cursor: "pointer" }}
                >
                  + Add note
                </button>
              </div>
              {selected.doctorNotes.length === 0 ? (
                <p className="text-[12px]" style={{ color: "var(--ink-faint)" }}>No notes yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selected.doctorNotes.map((note) => (
                    <div key={note.id} className="flex items-start justify-between gap-3 p-3 rounded-[6px]" style={{ background: "var(--cream)" }}>
                      <div className="flex-1 min-w-0">
                        {note.type === "TEXT" ? (
                          <p className="text-[13px] leading-[1.6] whitespace-pre-wrap" style={{ color: "var(--ink-muted)" }}>{note.content}</p>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={note.imageUrl ?? ""} alt="Doctor's note" className="rounded-[4px] max-h-[220px]" />
                        )}
                        <div className="text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>
                          {new Date(note.createdAt).toLocaleString("en-PH")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="text-[10px] font-medium flex-shrink-0"
                        style={{ background: "none", border: "none", padding: 0, color: "#C62828", cursor: deletingNoteId === note.id ? "not-allowed" : "pointer", opacity: deletingNoteId === note.id ? 0.6 : 1 }}
                      >
                        {deletingNoteId === note.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Delete */}
            <div className="pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: "var(--ink-muted)" }}>Delete this request permanently?</span>
                  <button
                    onClick={() => deleteRecord(selected.id)}
                    disabled={deleting}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] text-white"
                    style={{ background: "#C62828", opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
                  >
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
                    style={{ borderColor: "rgba(0,0,0,0.15)", color: "var(--ink-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="text-[11px] font-medium"
                  style={{ background: "none", border: "none", padding: 0, color: "#C62828", cursor: "pointer" }}
                >
                  Delete request
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="hidden lg:flex rounded-[8px] items-center justify-center"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", minHeight: 300 }}
          >
            <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>Select a consult request to view details</p>
          </div>
        )}
      </div>

      {/* Add note modal */}
      <div className={`note-backdrop${noteModalOpen ? " open" : ""}`} onClick={() => setNoteModalOpen(false)} />
      <div className={`note-modal${noteModalOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="note-modal-heading">
        <button type="button" onClick={() => setNoteModalOpen(false)} className="note-modal-close" aria-label="Close">×</button>
        <h3 id="note-modal-heading" className="font-display font-light text-[20px] mb-4" style={{ color: "var(--ink)" }}>
          Add a doctor&apos;s note
        </h3>
        <div className="note-mode-tabs mb-4">
          <button type="button" onClick={() => setNoteMode("write")} className={`note-mode-tab${noteMode === "write" ? " active" : ""}`}>Write</button>
          <button type="button" onClick={() => setNoteMode("photo")} className={`note-mode-tab${noteMode === "photo" ? " active" : ""}`}>Upload photo</button>
        </div>

        {noteMode === "write" ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note…"
              rows={6}
              className="w-full text-[13px] p-3 rounded-[6px] border resize-none"
              style={{ borderColor: "rgba(0,0,0,0.15)", color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={() => addNote({ type: "TEXT", content: noteText })}
              disabled={savingNote || !noteText.trim()}
              className="text-[11px] tracking-[0.06em] uppercase px-4 py-3 rounded-[4px] self-end text-white"
              style={{ background: "var(--teal)", opacity: savingNote || !noteText.trim() ? 0.6 : 1, cursor: savingNote || !noteText.trim() ? "not-allowed" : "pointer" }}
            >
              {savingNote ? "Saving…" : "Save note"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
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
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  disabled={savingNote}
                  className="text-[11px] tracking-[0.06em] uppercase px-4 py-3 rounded-[4px] self-start text-white"
                  style={{ background: "var(--teal)", opacity: savingNote ? 0.6 : 1, cursor: savingNote ? "not-allowed" : "pointer" }}
                >
                  {savingNote ? "Saving…" : "Choose photo"}
                </button>
              )}
            </CldUploadWidget>
          </div>
        )}
      </div>
    </div>
  );
}
