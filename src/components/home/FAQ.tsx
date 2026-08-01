"use client";

import { useEffect, useState } from "react";
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

// Rough upper bound on the popover's rendered height (tag + question +
// longest answer + padding), used to decide whether it fits below the
// tapped row or needs to open upward instead.
const POPOVER_HEIGHT_ESTIMATE = 280;

export default function FAQ() {
  const [selected, setSelected] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top?: number; bottom?: number }>({});
  const [popoverFromBottom, setPopoverFromBottom] = useState(false);

  // Lock background scroll while the mobile answer popover is open, since its
  // position is computed once (relative to the viewport) when it opens.
  useEffect(() => {
    if (!popoverOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [popoverOpen]);

  function openPopover(i: number, row: HTMLElement) {
    const rect = row.getBoundingClientRect();
    const fitsBelow = window.innerHeight - rect.bottom >= POPOVER_HEIGHT_ESTIMATE + 16;
    setPopoverFromBottom(!fitsBelow);
    setPopoverAnchor(
      fitsBelow ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 }
    );
    setSelected(i);
    setPopoverOpen(true);
  }

  return (
    <section className="px-6 py-16 sm:px-10 md:px-16 lg:px-20 md:py-24" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
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

          {/* Desktop — index + detail, side by side */}
          <div
            className="hidden lg:grid lg:grid-cols-[280px_1fr]"
            style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden" }}
          >
            <div
              className="faq-index"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
            >
              {faqs.map((faq, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`faq-index-row${selected === i ? " active" : ""}`}
                >
                  <span className="mark" />
                  <span>{faq.q}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: "36px 32px" }}>
              <h3
                className="font-display"
                style={{
                  fontSize: "clamp(19px, 2vw, 24px)",
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "var(--ink)",
                  marginBottom: 16,
                }}
              >
                {faqs[selected].q}
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--ink-muted)", maxWidth: "58ch" }}>
                {faqs[selected].a}
              </p>
            </div>
          </div>

          {/* Mobile/tablet — index list; tapping a question grows a glass
              popover open directly below it, over a blurred backdrop, rather
              than swapping to a full-screen drawer (VS-52 mobile follow-up). */}
          <div className="lg:hidden">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={(e) => openPopover(i, e.currentTarget)}
                className={`faq-mobile-row${popoverOpen && selected === i ? " active" : ""}`}
              >
                <span>{faq.q}</span>
                <span className="arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`faq-backdrop${popoverOpen ? " open" : ""}`}
        onClick={() => setPopoverOpen(false)}
        aria-hidden
        style={{ backdropFilter: "blur(6px) saturate(140%)", WebkitBackdropFilter: "blur(6px) saturate(140%)" }}
      />
      <div
        className={`faq-popover${popoverFromBottom ? " from-bottom" : ""}${popoverOpen ? " open" : ""}`}
        style={{
          ...popoverAnchor,
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
        }}
      >
        <div className="faq-popover-tag">Answer</div>
        <h4
          className="font-display"
          style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.35, color: "var(--ink)", marginBottom: 10 }}
        >
          {faqs[selected].q}
        </h4>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-mid)" }}>{faqs[selected].a}</p>
      </div>
    </section>
  );
}
