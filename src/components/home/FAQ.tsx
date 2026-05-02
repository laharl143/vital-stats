"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    q: "Are these products available without a prescription?",
    a: "Injectable products (Tirzepatide, NAD+, GHK-Cu) require medical supervision and are not sold over-the-counter. Our clinical team manages all prescriptions and oversight.",
  },
  {
    q: "How do I know the products are authentic?",
    a: "All products are sourced exclusively from verified pharmaceutical suppliers. Our skincare line holds Philippine FDA approval. We do not resell unverified or gray-market products.",
  },
  {
    q: "How long before I see results?",
    a: "Weight management clients typically see measurable results within 4–8 weeks. Skincare results appear within 3–6 weeks of consistent use. Peptide therapy timelines vary by protocol.",
  },
  {
    q: "Can I start a program remotely?",
    a: "Yes. Initial consultations and program design can be conducted remotely. Some injectable programs may require an in-person baseline assessment depending on your location and health profile.",
  },
  {
    q: "What is the cost?",
    a: "Pricing varies by product and program duration. Skincare products have fixed pricing. Injectable programs are priced on inquiry due to individualized dosing requirements.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section style={{ background: "#ffffff", padding: "96px 64px" }}>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-20">
        {/* Left */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            FAQ
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(28px, 2.8vw, 38px)",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            Common
            <br />
            questions
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              fontWeight: 400,
              color: "var(--ink-muted)",
              marginTop: 20,
            }}
          >
            Can&apos;t find an answer? Send us a message.
          </p>
          <Link
            href="/contact"
            className="inline-block text-[11px] font-medium tracking-[0.1em] uppercase pb-[2px] mt-5"
            style={{
              color: "var(--teal)",
              borderBottom: "1px solid var(--teal)",
              textDecoration: "none",
            }}
          >
            Contact us →
          </Link>
        </div>

        {/* Accordion */}
        <div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex justify-between items-center text-left"
                style={{
                  padding: "20px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "var(--ink)",
                    paddingRight: 24,
                    lineHeight: 1.4,
                  }}
                >
                  {faq.q}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: "var(--teal)",
                    flexShrink: 0,
                    transform: open === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  +
                </span>
              </button>
              <div
                style={{
                  overflow: "hidden",
                  maxHeight: open === i ? 200 : 0,
                  transition: "max-height 0.3s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.8,
                    fontWeight: 400,
                    color: "var(--ink-muted)",
                    paddingBottom: 20,
                  }}
                >
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }} />
        </div>
      </div>
    </section>
  );
}
