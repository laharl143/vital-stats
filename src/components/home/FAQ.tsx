"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    q: "Is the Tirzepatide program doctor-guided?",
    a: "Yes. Our Tirzepatide program is fully doctor-guided and focused on long-term results. This isn't a one-time service — we monitor your progress, adjust your plan when needed, and make sure you stay on track safely. You'll be guided every step of the way by an aesthetic doctor and a medical technologist specialized in weight management.",
  },
  {
    q: "How is Tirzepatide administered?",
    a: "Tirzepatide is a once-weekly injection administered in the stomach area. It helps control appetite and supports metabolic balance — a next-level approach to weight management that is guided, structured, and built for real results. Note: Prescription only. Our licensed doctor will assess, guide, and provide prescriptions every step of your journey.",
  },
  {
    q: "How do I know the products are authentic and safe?",
    a: "Quality you can trust. All our products come from verified and thoroughly screened suppliers, with proper cold-chain handling to maintain product integrity and safety. Our skincare line also holds Philippine FDA approval. We do not resell unverified or gray-market products.",
  },
  {
    q: "Why choose VitalStats for weight management?",
    a: "Our team has been trained through multiple seminars in Tirzepatide-based weight management, with real experience guiding clients safely and effectively. We are led by an aesthetic doctor and a medical technologist specialized in weight management, with a focus on proper screening, monitoring, and consistent results.",
  },
  {
    q: "Are these products available without a prescription?",
    a: "Injectable products like Tirzepatide, NAD+, and GHK-Cu require medical supervision and are not sold over-the-counter. Our clinical team manages all prescriptions and oversight to ensure your safety throughout the program.",
  },
  {
    q: "How long before I see results?",
    a: "Weight management clients typically see measurable results within 4–8 weeks. Skincare results appear within 3–6 weeks of consistent use. Peptide therapy timelines vary by protocol and individual health profile.",
  },
  {
    q: "Can I start a program remotely?",
    a: "Yes. Initial consultations and program design can be conducted remotely. Some injectable programs may require an in-person baseline assessment depending on your location and health profile.",
  },
  {
    q: "What is the cost?",
    a: "Pricing varies by product and program duration. Skincare products have fixed pricing. Injectable programs are priced on inquiry due to individualized dosing requirements. Reach out to us directly for a personalized quote.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="px-6 py-16 sm:px-10 md:px-16 lg:px-20 md:py-24" style={{ background: "#ffffff" }}>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 md:gap-20">
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

          {/* CTA card */}
          <div
            className="mt-10 p-5 rounded-[4px]"
            style={{ background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}
          >
            <div
              className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-2"
              style={{ color: "var(--teal-dark)" }}
            >
              Ready to start?
            </div>
            <p className="text-[12px] leading-[1.7] mb-4" style={{ color: "var(--ink-muted)" }}>
              Complete your Patient Medical History Form and our clinical team will design the right program for you.
            </p>
            <Link
              href="/book-consult"
              className="inline-block text-white text-[11px] font-medium tracking-[0.08em] uppercase px-5 py-[10px] rounded-[2px] transition-opacity duration-200 hover:opacity-85"
              style={{ background: "var(--teal)" }}
            >
              Book a Consult →
            </Link>
          </div>
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
                    fontWeight: open === i ? 500 : 400,
                    color: open === i ? "var(--teal)" : "var(--ink)",
                    paddingRight: 24,
                    lineHeight: 1.4,
                    transition: "color 0.2s",
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
                  maxHeight: open === i ? 400 : 0,
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