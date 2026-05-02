"use client";

import Image from "next/image";
import Link from "next/link";

const stats = [
  { value: "11+", label: "Products" },
  { value: "4", label: "Programs" },
  { value: "FDA", label: "Approved" },
  { value: "MD", label: "Supervised" },
];

const trustItems = [
  "Philippine FDA–Approved",
  "Medically Supervised",
  "Licensed Professionals",
];

export default function Hero() {
  return (
    <section
      className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative overflow-hidden"
      style={{ background: "var(--cream)" }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(46,139,114,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(46,139,114,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.6,
        }}
      />

      {/* Left — copy */}
      <div className="flex flex-col justify-center relative z-10 px-8 pt-32 pb-20 sm:px-12 md:px-16 lg:px-20 xl:px-24">
        {/* Eyebrow */}
        <div className="eyebrow animate-fade-up delay-100 mb-8">
          Precision Wellness for Body &amp; Skin
        </div>

        {/* Headline */}
        <h1
          className="font-display animate-fade-up delay-200 mb-8"
          style={{
            fontSize: "clamp(48px, 6vw, 96px)",
            fontWeight: 400,
            lineHeight: 1.05,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Clinically guided.
          <br />
          <em style={{ fontStyle: "italic", color: "var(--teal)" }}>
            Beautifully
          </em>
          <br />
          delivered.
        </h1>

        {/* Sub */}
        <p
          className="animate-fade-up delay-300 mb-12"
          style={{
            fontSize: "clamp(14px, 1.4vw, 18px)",
            lineHeight: 1.8,
            fontWeight: 400,
            color: "var(--ink-muted)",
            maxWidth: 480,
          }}
        >
          Medical-grade treatments and premium skincare, supervised by licensed
          professionals. From weight management to cellular regeneration.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 items-center animate-fade-up delay-400">
          <Link
            href="/products"
            className="text-white font-medium tracking-[0.1em] uppercase rounded-[2px] transition-all duration-200 hover:-translate-y-px hover:opacity-90"
            style={{
              background: "var(--teal)",
              fontSize: "clamp(11px, 0.9vw, 13px)",
              padding: "clamp(12px, 1.2vw, 18px) clamp(28px, 3vw, 44px)",
            }}
          >
            View Products
          </Link>
          <Link
            href="/products#programs"
            className="font-normal tracking-[0.1em] uppercase rounded-[2px] border transition-all duration-200"
            style={{
              color: "var(--ink-muted)",
              borderColor: "rgba(0,0,0,0.15)",
              fontSize: "clamp(11px, 0.9vw, 13px)",
              padding: "clamp(11px, 1.1vw, 17px) clamp(24px, 2.5vw, 38px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--teal)";
              e.currentTarget.style.color = "var(--teal)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
              e.currentTarget.style.color = "var(--ink-muted)";
            }}
          >
            Our Programs
          </Link>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap gap-6 animate-fade-up delay-500 mt-14">
          {trustItems.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2"
              style={{
                fontSize: "clamp(11px, 0.85vw, 13px)",
                letterSpacing: "0.04em",
                color: "var(--ink-faint)",
              }}
            >
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 6, height: 6, background: "var(--teal-light)" }}
              />
              {item}
            </div>
          ))}
        </div>

        {/* Stat card — mobile only */}
        <div className="flex flex-col gap-4 w-full mt-14 md:hidden">
          <div
            className="w-full"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 4,
              padding: "32px 28px",
            }}
          >
            <div className="grid grid-cols-2 gap-[2px]">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: "22px 20px",
                    background: "var(--cream)",
                    borderRadius:
                      i === 0 ? "3px 0 0 0" : i === 1 ? "0 3px 0 0" : i === 2 ? "0 0 0 3px" : "0 0 3px 0",
                  }}
                >
                  <div className="font-display" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1, color: "var(--ink)", marginBottom: 6 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500, color: "var(--ink-faint)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className="self-end flex items-center gap-2"
            style={{ padding: "9px 18px", borderRadius: 2, background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}
          >
            <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: "var(--teal-light)" }} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-dark)" }}>
              Active Programs Available
            </span>
          </div>
        </div>
      </div>

      {/* Right — stat card (desktop) */}
      <div className="hidden md:flex flex-col justify-center items-center relative z-10 px-10 lg:px-14 xl:px-16 pt-32 pb-20">
        <div className="flex flex-col gap-4 w-full" style={{ maxWidth: "min(520px, 90%)" }}>
          <div
            className="w-full"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 6,
              padding: "clamp(36px, 3.5vw, 56px) clamp(32px, 3vw, 48px)",
            }}
          >
            {/* Brand lockup */}
            <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <Image
                src="/logo.png"
                alt="VitalStats"
                width={160}
                height={44}
                className="w-auto object-contain"
                style={{ height: "clamp(36px, 3.2vw, 52px)", marginBottom: 12 }}
              />
              <div style={{ fontSize: "clamp(9px, 0.75vw, 11px)", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                Precision Wellness · PH
              </div>
            </div>

            {/* Stats 2×2 */}
            <div className="grid grid-cols-2 gap-[3px]">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: "clamp(20px, 2.2vw, 36px) clamp(18px, 2vw, 32px)",
                    background: "var(--cream)",
                    borderRadius:
                      i === 0 ? "3px 0 0 0" : i === 1 ? "0 3px 0 0" : i === 2 ? "0 0 0 3px" : "0 0 3px 0",
                  }}
                >
                  <div
                    className="font-display"
                    style={{
                      fontSize: "clamp(36px, 3.8vw, 58px)",
                      fontWeight: 400,
                      lineHeight: 1,
                      color: "var(--ink)",
                      marginBottom: 6,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: "clamp(9px, 0.75vw, 11px)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500, color: "var(--ink-faint)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 24, paddingTop: 22, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "clamp(11px, 0.9vw, 14px)", color: "var(--ink-faint)", lineHeight: 1.7 }}>
                Serving clients across the Philippines with medical-grade products &amp; verified protocols.
              </p>
            </div>
          </div>

          {/* Active badge */}
          <div
            className="self-end flex items-center gap-2"
            style={{ padding: "10px 20px", borderRadius: 2, background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}
          >
            <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: "var(--teal-light)" }} />
            <span style={{ fontSize: "clamp(10px, 0.8vw, 12px)", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-dark)" }}>
              Active Programs Available
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10" style={{ opacity: 0.4 }}>
        <span style={{ fontSize: "clamp(9px, 0.7vw, 11px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
          Scroll
        </span>
        <div style={{ width: 1, height: 40, background: "var(--ink-faint)", animation: "scrollPulse 2s ease-in-out infinite" }} />
      </div>
    </section>
  );
}