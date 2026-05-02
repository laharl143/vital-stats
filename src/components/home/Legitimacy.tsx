"use client";

import Link from "next/link";

const badges = [
  {
    title: "Philippine FDA–Approved",
    desc: "Our skincare line is reviewed and approved by the Philippine Food and Drug Administration for safety and efficacy.",
  },
  {
    title: "Clinically Guided",
    desc: "Every product is offered alongside proper professional guidance for safe, responsible, and effective use.",
  },
  {
    title: "Verified Pharmaceutical Suppliers",
    desc: "Authentic products sourced only from trusted and verified pharmaceutical partners. Zero gray-market.",
  },
  {
    title: "Medical Oversight",
    desc: "Injectable programs are medically supervised with periodic progress monitoring and clinical check-ins.",
  },
];

export default function Legitimacy() {
  return (
    <section
      className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-20 items-center"
      style={{
        background:
          "linear-gradient(135deg, var(--teal-deep) 0%, #0C3D30 60%, #0F4A3C 100%)",
        padding: "96px 64px",
      }}
    >
      {/* Left copy */}
      <div>
        <div
          className="eyebrow light"
          style={{ marginBottom: 20 }}
        >
          Our commitment
        </div>
        <h2
          className="font-display text-white"
          style={{
            fontSize: "clamp(28px, 2.8vw, 38px)",
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          Authentic products.
          <br />
          Verified suppliers.
          <br />
          Safe practice.
        </h2>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.85,
            fontWeight: 400,
            color: "rgba(255,255,255,0.52)",
            marginTop: 20,
          }}
        >
          We source exclusively from trusted pharmaceutical suppliers. Every
          injectable program is handled by trained medical professionals
          including licensed medical technologists.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link
            href="/contact"
            className="text-[11px] font-medium tracking-[0.1em] uppercase pb-[2px]"
            style={{
              color: "var(--teal-light)",
              borderBottom: "1px solid var(--teal-light)",
              textDecoration: "none",
            }}
          >
            Request credentials →
          </Link>
        </div>
      </div>

      {/* Badges — spans 2 cols */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((b) => (
          <div
            key={b.title}
            style={{
              padding: "28px 24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
            }}
          >
            <div
              style={{
                width: 20,
                height: 1,
                background: "var(--teal-light)",
                marginBottom: 16,
              }}
            />
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#ffffff",
                marginBottom: 8,
              }}
            >
              {b.title}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.42)",
                fontWeight: 400,
              }}
            >
              {b.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
