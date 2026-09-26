"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Required consent box for any public form that collects personal data (spec 0001).
// Put the wording, with <LegalLink>s, in children. The server still checks it
// through readConsent; this only stops the form before it is sent.
export default function ConsentCheckbox({
  checked,
  onChange,
  invalid = false,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-1"
      style={{ boxShadow: invalid ? "0 0 0 1.5px #DC2626" : undefined, borderRadius: 6 }}
    >
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        style={{ marginTop: 2, accentColor: "var(--teal)" }}
      />
      <span className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{children}</span>
    </label>
  );
}

// Opens in a new tab so whatever the person typed in the form is not lost.
export function LegalLink({ href, children }: { href: "/privacy" | "/terms" | "/disclaimer"; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--teal)" }}>
      {children}
    </Link>
  );
}
