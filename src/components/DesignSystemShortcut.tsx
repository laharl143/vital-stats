"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ctrl+Shift+D anywhere on the homepage jumps to the internal design-system
// reference page — companion to AdminShortcut.tsx's Ctrl+Shift+A.
//
// D is also Chrome/Brave/Edge's default "bookmark all tabs" shortcut, so an
// earlier pass avoided it expecting the native dialog to fire alongside (or
// instead of) this handler. Confirmed working as-is in Ed's browser — this
// listener's preventDefault() is enough to suppress the native dialog here.
export default function DesignSystemShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        router.push("/design-system");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
