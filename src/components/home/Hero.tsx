"use client";

import Image from "next/image";
import Link from "next/link";

const stats = [
  { num: "11+", label: "Products" },
  { num: "4",   label: "Programs" },
  { num: "FDA", label: "Approved" },
  { num: "MD",  label: "Supervised" },
];

const trustItems = [
  "Philippine FDA–Approved",
  "Medically Supervised",
  "Licensed Professionals",
];

export default function Hero() {
  return (
    <section className="min-h-[91vh] grid grid-cols-1 md:grid-cols-2">
      {/* Left — copy */}
      <div className="flex flex-col justify-center px-8 md:px-16 py-20">
        {/* Eyebrow */}
        <div
          className="flex items-center gap-4 text-[11px] font-medium tracking-[0.2em] uppercase mb-7 animate-fade-up"
          style={{ color: "var(--teal)" }}
        >
          <span className="block w-9 h-px" style={{ background: "var(--teal)" }} />
          Precision Wellness for Body &amp; Skin
        </div>

        {/* Headline */}
        <h1
          className="font-display font-light leading-[1.1] mb-7 animate-fade-up delay-100"
          style={{ fontSize: "clamp(44px, 4.5vw, 68px)", color: "var(--ink)" }}
        >
          Clinically guided.<br />
          <em className="italic" style={{ color: "var(--teal)" }}>Beautifully</em><br />
          delivered.
        </h1>

        {/* Sub */}
        <p
          className="text-[15px] leading-[1.75] font-light mb-11 max-w-[440px] animate-fade-up delay-200"
          style={{ color: "var(--ink-muted)" }}
        >
          Medical-grade treatments and premium skincare, supervised by licensed
          professionals. From weight management to cellular regeneration — your
          transformation starts here.
        </p>

        {/* Actions */}
        <div className="flex gap-4 items-center animate-fade-up delay-300">
          <Link
            href="/products"
            className="text-white text-[12px] font-medium tracking-[0.08em] uppercase px-9 py-[14px] rounded-[3px] transition-all duration-200 hover:-translate-y-px"
            style={{ background: "var(--teal)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--teal-dark)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--teal)")}
          >
            View Products
          </Link>
          <Link
            href="/products#programs"
            className="text-[12px] font-light tracking-[0.08em] uppercase px-7 py-[14px] rounded-[3px] border transition-all duration-200"
            style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)" }}
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
        <div className="flex flex-wrap gap-6 mt-12 animate-fade-up delay-400">
          {trustItems.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-[11px] tracking-[0.04em]"
              style={{ color: "var(--ink-faint)" }}
            >
              <span
                className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                style={{ background: "var(--teal-light)" }}
              />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right — teal panel */}
      <div
        className="relative hidden md:flex flex-col items-center justify-center gap-7 px-12 py-16"
        style={{
          background: "linear-gradient(145deg, var(--teal-deep) 0%, var(--teal-dark) 45%, var(--teal) 100%)",
        }}
      >
        {/* Subtle radial overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 40%)",
          }}
        />

        {/* Logo card */}
        <div
          className="relative z-10 flex flex-col items-center gap-2 px-14 py-11 w-full max-w-[320px]"
          style={{
            background: "rgba(255,255,255,0.97)",
            borderRadius: 20,
            boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          }}
        >
          <Image
            src="/logo.png"
            alt="VitalStats"
            width={200}
            height={80}
            className="w-[200px] h-auto"
            priority
          />
          <p
            className="text-[10px] tracking-[0.18em] uppercase text-center"
            style={{ color: "var(--ink-muted)" }}
          >
            Precision Wellness for Body &amp; Skin
          </p>
        </div>

        {/* Stats grid */}
        <div className="relative z-10 grid grid-cols-2 gap-[10px] w-full max-w-[320px]">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center py-4 px-5 rounded-[10px] text-center"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <span
                className="font-display font-light text-white leading-none text-[26px]"
              >
                {s.num}
              </span>
              <span
                className="text-[10px] tracking-[0.12em] uppercase mt-[5px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
