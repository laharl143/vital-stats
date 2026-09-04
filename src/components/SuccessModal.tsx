"use client";

type SuccessModalProps = {
  open: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onContinue: () => void;
};

export default function SuccessModal({ open, title, message, buttonLabel, onContinue }: SuccessModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999] flex items-center justify-center p-6"
      style={{ background: "rgba(15,74,60,0.75)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="flex flex-col items-center gap-4 text-center rounded-[14px]"
        style={{ background: "#ffffff", padding: "3rem 2.5rem", width: 380, maxWidth: "100%" }}
      >
        <div
          className="flex items-center justify-center rounded-full animate-modal-check-pop"
          style={{ width: 52, height: 52, background: "var(--teal-pale)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12l6 6L20 6"
              stroke="var(--teal-dark)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-modal-check-draw"
            />
          </svg>
        </div>
        <div className="font-display font-light text-[22px]" style={{ color: "var(--ink)" }}>
          {title}
        </div>
        <p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
          {message}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[12px] rounded-[3px] text-white"
          style={{ background: "var(--teal)" }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
