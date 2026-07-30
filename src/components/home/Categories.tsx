"use client";

import Link from "next/link";

const categories = [
  {
    num: "01",
    tag: "Injectable",
    name: "Weight Management",
    desc: "Tirzepatide GLP-1/GIP dual receptor therapy for lasting weight loss and metabolic control.",
    href: "/products?category=WEIGHT_MANAGEMENT",
    gradient: "linear-gradient(150deg, var(--mint), var(--teal))",
    textColor: "#ffffff",
  },
  {
    num: "02",
    tag: "Injectable",
    name: "Recovery & Anti-Aging",
    desc: "NAD+ and GHK-Cu peptide therapies for cellular repair, energy, and tissue regeneration.",
    href: "/products?category=RECOVERY_ANTI_AGING",
    gradient: "linear-gradient(150deg, var(--teal), var(--teal-deep))",
    textColor: "#ffffff",
  },
  {
    num: "03",
    tag: "Topical",
    name: "Skin Care Line",
    desc: "The Luméla collection — FDA-approved brightening cleansers, serums, toners, moisturizers.",
    href: "/products?category=SKIN_CARE",
    gradient: "linear-gradient(150deg, #e8c9a0, #c9986b)",
    textColor: "var(--ink)",
  },
  {
    num: "04",
    tag: "Service",
    name: "Medical Consultation",
    desc: "Personalized program design with ongoing clinical monitoring from licensed professionals.",
    href: "/contact",
    gradient: "linear-gradient(150deg, var(--ink-mid), var(--teal-deep))",
    textColor: "#ffffff",
  },
];

export default function Categories() {
  return (
    <section
      id="products"
      className="py-16 px-4 md:px-9"
      style={{ background: "var(--cream)" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
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
            className="hidden md:inline-flex text-[11px] font-medium tracking-widest uppercase pb-1 transition-opacity duration-200 hover:opacity-70"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.num}
              href={cat.href}
              className="group flex flex-col justify-between no-underline transition-transform duration-300 cursor-pointer hover:-translate-y-1"
              style={{
                padding: "26px 24px",
                minHeight: 260,
                borderRadius: 20,
                background: cat.gradient,
                textDecoration: "none",
              }}
            >
              <div>
                {/* Tag */}
                <span
                  className="inline-block text-[9px] tracking-[0.08em] uppercase"
                  style={{
                    fontWeight: 700,
                    color: cat.textColor,
                    background:
                      cat.textColor === "#ffffff"
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(13,21,18,0.1)",
                    borderRadius: 999,
                    padding: "4px 10px",
                  }}
                >
                  {cat.tag}
                </span>

                {/* Name */}
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: cat.textColor,
                    margin: "14px 0 8px",
                  }}
                >
                  {cat.name}
                </div>

                {/* Desc */}
                <p
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    fontWeight: 400,
                    color: cat.textColor,
                    opacity: 0.85,
                  }}
                >
                  {cat.desc}
                </p>
              </div>

              {/* CTA pill */}
              <span
                className="self-start text-[10.5px] font-bold tracking-wider uppercase transition-transform duration-200 group-hover:translate-x-1"
                style={{
                  marginTop: 18,
                  background:
                    cat.textColor === "#ffffff" ? "rgba(255,255,255,0.92)" : "#ffffff",
                  color: "var(--ink)",
                  padding: "8px 16px",
                  borderRadius: 999,
                }}
              >
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
