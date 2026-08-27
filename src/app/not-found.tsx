import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "60vh", paddingTop: 140, paddingBottom: 100 }}
      >
        <div className="eyebrow" style={{ justifyContent: "center", marginBottom: 20 }}>
          404
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}
        >
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", maxWidth: 420, marginBottom: 32 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you
          back on track.
        </p>
        <Link
          href="/"
          className="transition-colors duration-200"
          style={{
            display: "inline-block",
            background: "var(--teal-deep)",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            padding: "14px 32px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
