"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export type DesignSystemTab = "system" | "graphics" | "copy";

const TABS: { id: DesignSystemTab; label: string }[] = [
  { id: "system", label: "System" },
  { id: "graphics", label: "Graphics" },
  { id: "copy", label: "Copy" },
];

// Always visible on /design-system — reaching this page already happens via
// a deliberate act (the Ctrl+Shift+D shortcut on the homepage, see
// DesignSystemShortcut.tsx, or a direct link), so there's no separate
// show/hide step here.
export default function DesignSystemSwitcher({
  active,
  onChange,
}: {
  active: DesignSystemTab;
  onChange: (tab: DesignSystemTab) => void;
}) {
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-1"
      style={{
        zIndex: 80,
        background: "rgba(13,21,18,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999,
        padding: 6,
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="text-[11px] font-semibold tracking-[0.06em] uppercase px-4 py-2 rounded-full transition-colors duration-150 cursor-pointer"
            style={{
              background: isActive ? "var(--teal)" : "transparent",
              color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
              border: "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}

      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />

      <Link
        href="/"
        aria-label="Back to homepage"
        className="flex items-center justify-center rounded-full transition-colors duration-150"
        style={{ width: 32, height: 32, color: "rgba(255,255,255,0.65)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
      >
        <Home size={16} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
