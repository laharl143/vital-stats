"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ctrl+Shift+A anywhere in the admin portal jumps back to the public site —
// VS-100, the companion to AdminShortcut.tsx (which does the reverse from
// the homepage), so switching between the two doesn't need a link each time.
export default function WebsiteShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        router.push("/");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
