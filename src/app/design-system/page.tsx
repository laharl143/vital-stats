"use client";

import { useState } from "react";
import DesignSystemSwitcher, { type DesignSystemTab } from "@/components/design-system/DesignSystemSwitcher";
import SystemTab from "@/components/design-system/tabs/SystemTab";
import GraphicsTab from "@/components/design-system/tabs/GraphicsTab";
import CopyTab from "@/components/design-system/tabs/CopyTab";

// Internal reference page — no Navbar/Footer, this isn't a marketing page.
// Reached via Ctrl+Shift+D on the homepage (DesignSystemShortcut.tsx) or a
// direct link.
export default function DesignSystemPage() {
  const [active, setActive] = useState<DesignSystemTab>("system");

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--cream)" }}>
      <div className="h-full overflow-y-auto px-8 md:px-16 py-12" style={{ zoom: 2 }}>
        <div className="mb-10">
          <div
            className="text-[11px] font-medium tracking-[0.2em] uppercase mb-2"
            style={{ color: "var(--teal)" }}
          >
            Design System
          </div>
          <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>
            {active === "system" && "System"}
            {active === "graphics" && "Graphics"}
            {active === "copy" && "Copy"}
          </h1>
        </div>

        {active === "system" && <SystemTab />}
        {active === "graphics" && <GraphicsTab />}
        {active === "copy" && <CopyTab />}
      </div>

      <DesignSystemSwitcher active={active} onChange={setActive} />
    </div>
  );
}
