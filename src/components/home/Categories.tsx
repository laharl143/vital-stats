"use client";

import Link from "next/link";

const categories = [
  {
    num: "01",
    tag: "Injectable",
    name: "Weight Management",
    desc: "Tirzepatide GLP-1/GIP dual receptor therapy for lasting weight loss and metabolic control.",
    href: "/products?category=WEIGHT_MANAGEMENT",
  },
  {
    num: "02",
    tag: "Injectable",
    name: "Recovery & Anti-Aging",
    desc: "NAD+ and GHK-Cu peptide therapies for cellular repair, energy, and tissue regeneration.",
    href: "/products?category=RECOVERY_ANTI_AGING",
  },
  {
    num: "03",
    tag: "Topical",
    name: "Skin Care Line",
    desc: "The Luméla collection — FDA-approved brightening cleansers, serums, toners, moisturizers.",
    href: "/products?category=SKIN_CARE",
  },
  {
    num: "04",
    tag: "Service",
    name: "Medical Consultation",
    desc: "Personalized program design with ongoing clinical monitoring from licensed professionals.",
    href: "/products?category=MEDICAL_CONSULTATION",
  },
];

export default function Categories() {
  return (
    <section
      id="products"
      className="py-24"
      style={{ background: "#ffffff", padding: "96px 64px" }}
    >
      {/* Header */}
      <div
        className="flex items-end justify-between"
        style={{ marginBottom: 56 }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            What we offer
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(32px, 3vw, 42px)",
              fontWeight: 400,
              lineHeight: 1.12,
              color: "var(--ink)",
            }}
          >
            Four pathways to
            <br />
            your best self
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden md:inline-flex text-[11px] font-medium tracking-[0.1em] uppercase pb-1 transition-opacity duration-200 hover:opacity-70"
          style={{
            color: "var(--teal)",
            borderBottom: "1px solid var(--teal)",
            textDecoration: "none",
          }}
        >
          View all programs →
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2px]">
        {categories.map((cat) => (
          <Link
            key={cat.num}
            href={cat.href}
            className="group flex flex-col justify-between no-underline transition-colors duration-300 cursor-pointer"
            style={{
              padding: "36px 32px",
              minHeight: 280,
              background: "var(--cream)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--teal-pale)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--cream)")
            }
          >
            <div>
              {/* Big number */}
              <div
                className="font-display"
                style={{
                  fontSize: 64,
                  fontWeight: 400,
                  lineHeight: 1,
                  color: "rgba(46,139,114,0.08)",
                  marginBottom: 20,
                  letterSpacing: "-0.02em",
                }}
              >
                {cat.num}
              </div>

              {/* Tag */}
              <span
                className="inline-block text-[9px] tracking-[0.14em] uppercase mb-3"
                style={{
                  fontWeight: 500,
                  color: "var(--teal)",
                  border: "1px solid rgba(46,139,114,0.25)",
                  borderRadius: 2,
                  padding: "3px 9px",
                }}
              >
                {cat.tag}
              </span>

              {/* Name */}
              <div
                className="font-display"
                style={{
                  fontSize: 22,
                  fontWeight: 400,
                  lineHeight: 1.2,
                  color: "var(--ink)",
                  marginBottom: 10,
                }}
              >
                {cat.name}
              </div>

              {/* Desc */}
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  fontWeight: 400,
                  color: "var(--ink-muted)",
                }}
              >
                {cat.desc}
              </p>
            </div>

            {/* Arrow */}
            <div
              className="self-end text-[18px] transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1"
              style={{ color: "var(--teal)" }}
            >
              ↗
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
