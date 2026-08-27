"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main
          className="flex flex-col items-center justify-center text-center px-6"
          style={{ minHeight: "100vh" }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--teal)",
              marginBottom: 20,
            }}
          >
            Error
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-muted)", maxWidth: 420, marginBottom: 32 }}>
            VitalStats hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              background: "var(--teal-deep)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "14px 32px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
