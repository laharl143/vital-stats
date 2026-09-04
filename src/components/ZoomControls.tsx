"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.5;
const STEP = 0.1;

// Desktop-only convenience mirror of the browser's native Ctrl+/Ctrl-
// zoom shortcut. `zoom` is a CSS property Chromium/Edge support natively;
// browsers without it (Firefox/Safari) just leave the page at 100% — the
// buttons become a no-op there rather than throwing.
export default function ZoomControls() {
  const [level, setLevel] = useState(1);

  useEffect(() => {
    document.documentElement.style.setProperty("zoom", String(level));
  }, [level]);

  const zoomOut = () => setLevel((l) => Math.max(MIN_ZOOM, +(l - STEP).toFixed(2)));
  const zoomIn = () => setLevel((l) => Math.min(MAX_ZOOM, +(l + STEP).toFixed(2)));

  return (
    <div
      className="hidden md:flex fixed bottom-6 left-6 items-center gap-1"
      style={{
        zIndex: 60,
        background: "rgba(13,21,18,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999,
        padding: 6,
      }}
    >
      <button
        type="button"
        onClick={zoomOut}
        disabled={level <= MIN_ZOOM}
        aria-label="Zoom out"
        className="flex items-center justify-center rounded-full transition-colors duration-150"
        style={{
          width: 30,
          height: 30,
          color: "rgba(255,255,255,0.85)",
          opacity: level <= MIN_ZOOM ? 0.35 : 1,
          cursor: level <= MIN_ZOOM ? "default" : "pointer",
        }}
      >
        <Minus size={14} strokeWidth={2} />
      </button>

      <span
        style={{
          minWidth: 34,
          textAlign: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
        }}
      >
        {Math.round(level * 100)}%
      </span>

      <button
        type="button"
        onClick={zoomIn}
        disabled={level >= MAX_ZOOM}
        aria-label="Zoom in"
        className="flex items-center justify-center rounded-full transition-colors duration-150"
        style={{
          width: 30,
          height: 30,
          color: "rgba(255,255,255,0.85)",
          opacity: level >= MAX_ZOOM ? 0.35 : 1,
          cursor: level >= MAX_ZOOM ? "default" : "pointer",
        }}
      >
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
