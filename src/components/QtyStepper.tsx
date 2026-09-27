"use client";

import { Minus, Plus } from "lucide-react";

// Minus / value / plus, limited to min..max (VS-253). The value is announced through the group label.
export default function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (qty: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const button = "flex items-center justify-center w-11 h-11 disabled:opacity-35 disabled:cursor-not-allowed";
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-[3px]"
      style={{ border: "1px solid rgba(13,21,18,0.18)", background: "#fff" }}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus aria-hidden="true" size={14} style={{ color: "var(--ink)" }} />
      </button>
      <span className="w-8 text-center text-[14px] font-medium tabular-nums" style={{ color: "var(--ink)" }} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus aria-hidden="true" size={14} style={{ color: "var(--ink)" }} />
      </button>
    </div>
  );
}
