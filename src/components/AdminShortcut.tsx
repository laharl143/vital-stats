"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ctrl+Shift+A anywhere on the homepage jumps straight to the admin portal
// (middleware bounces to /admin/login if not authenticated) — VS-98, a
// shortcut for reaching admin without hunting for the footer link.
export default function AdminShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        router.push("/admin");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
