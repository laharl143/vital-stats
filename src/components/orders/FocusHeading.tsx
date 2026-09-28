"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// The status page heading. Right after checkout (?new=1) it takes focus, so a screen reader announces
// the confirmation (spec 0005, AC-8).
export default function FocusHeading({
  focus, className, style, children,
}: { focus: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <h1 ref={ref} tabIndex={-1} className={className} style={style}>
      {children}
    </h1>
  );
}
