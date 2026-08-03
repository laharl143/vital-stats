"use client";

import { useEffect } from "react";

// The blurred, click-to-close backdrop behind the navbar's in-pill search
// input. Rendered as a sibling of the navbar's (transformed) wrapper div,
// not a descendant of it — `transform` on an ancestor creates a new
// containing block for `position: fixed` elements, which would shrink this
// backdrop's `inset-0` down to the navbar's own short box instead of the
// real viewport.
export default function SearchBackdrop({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40"
      style={{
        background: "rgba(13,21,18,0.28)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onClick={onClose}
    />
  );
}
