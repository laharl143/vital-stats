"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "60vh", paddingTop: 140, paddingBottom: 100 }}
      >
        <div className="eyebrow" style={{ justifyContent: "center", marginBottom: 20 }}>
          Error
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}
        >
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", maxWidth: 420, marginBottom: 32 }}>
          We hit an unexpected error loading this page. You can try again, or head back home.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="transition-colors duration-200"
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
          <Link
            href="/"
            className="transition-colors duration-200"
            style={{
              display: "inline-block",
              color: "var(--teal-deep)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "14px 32px",
              borderRadius: 999,
              border: "1px solid var(--teal-deep)",
              textDecoration: "none",
            }}
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
