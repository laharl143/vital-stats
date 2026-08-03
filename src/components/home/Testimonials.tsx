"use client";

import { useEffect, useRef, useState } from "react";
import { useLiquidWaveBackground } from "@/lib/useLiquidWaveBackground";

const testimonials = [
  {
    name: "Miguel Santos",
    program: "Weight Management",
    result: "−14 lbs in 8 weeks",
    quote:
      "The Tirzepatide program completely changed my relationship with food. I finally have energy again and the weight is staying off.",
    gradient: "linear-gradient(150deg, var(--mint), var(--teal))",
  },
  {
    name: "Dr. Ramon Villanueva",
    program: "Recovery & Anti-Aging",
    result: "NAD+ Protocol",
    quote:
      "As a physician myself, I was skeptical. The clinical oversight and verified sourcing made me confident. The results on my cellular energy levels were remarkable.",
    gradient: "var(--teal-deep)",
  },
  {
    name: "Ma. Kyla Tapalla",
    program: "Luméla Skin Care",
    result: "6-week protocol",
    quote:
      "My dermatologist noticed the difference before I even told her what I changed. Luméla has been extraordinary for my hyperpigmentation.",
    gradient: "linear-gradient(150deg, #e8c9a0, #c9986b)",
  },
];

const EXIT_MS = 200;

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLiquidWaveBackground(canvasRef);

  // Perpetual loop — always advances every 12s, regardless of mouse position.
  // (Previously paused on hover over the whole section, which made it look
  // "stuck" any time the cursor happened to rest there while reading.)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % testimonials.length);
    }, 12000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Quick fade+scale out, then swap content and let each element's own CSS
  // keyframe animation (remounted via key={displayIndex}) play its entrance —
  // a word-by-word stagger for the quote, staged "pop"/fade-up for everything
  // else. No requestAnimationFrame chaining here on purpose: an earlier
  // version drove the entrance via a setTimeout -> rAF -> rAF chain, and
  // because the setTimeout's own state update (setDisplayIndex) is a
  // dependency of this same effect, React would re-run the effect and its
  // cleanup would cancel the just-scheduled (still-pending) rAF before it
  // ever fired — leaving the content permanently stuck invisible after the
  // first rotation. A plain setTimeout has no such pending async op left
  // dangling by the time its own callback finishes, so it's safe here.
  useEffect(() => {
    if (activeIndex === displayIndex) return;
    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setDisplayIndex(activeIndex);
      setExiting(false);
    }, EXIT_MS);
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [activeIndex, displayIndex]);

  const active = testimonials[displayIndex];
  const others = testimonials.filter((_, i) => i !== displayIndex);

  // Fold the opening/closing curly quotes into the first/last word so they
  // animate in as part of the same stagger sequence, instead of appearing
  // instantly as static characters outside it.
  const rawWords = active.quote.split(" ");
  const quoteWords = rawWords.map((w, i) => {
    if (rawWords.length === 1) return `“${w}”`;
    if (i === 0) return `“${w}`;
    if (i === rawWords.length - 1) return `${w}”`;
    return w;
  });

  return (
    <section
      className="relative px-4 md:px-9 pt-8 pb-28 md:pt-10 md:pb-32 overflow-hidden"
      style={{ background: "var(--cream)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />
      <div className="relative mx-auto" style={{ maxWidth: 1360, zIndex: 1 }}>
        {/* Header — static, doesn't slide with the rotating content below */}
        <div style={{ marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Client stories
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
            What our clients say
          </h2>
        </div>

        {/* Magazine pull-quote split — quick fade+scale out on exit, then the
            quote text reveals as a split-text word stagger on entrance */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-center"
          style={{
            opacity: exiting ? 0 : 1,
            transform: exiting ? "scale(0.98)" : "scale(1)",
            transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
          }}
        >
          {/* Pull-quote */}
          <div>
            {/* All quotes are stacked in the same grid cell (only the active
                one visible) so the cell height always matches the tallest
                quote in the array, at any viewport width — no hardcoded
                line count to keep in sync as testimonials are added. */}
            <div className="grid" style={{ marginBottom: 24 }}>
              {testimonials.map((t, i) => {
                const isActive = i === displayIndex;
                return (
                  <p
                    key={t.name}
                    className="font-display"
                    style={{
                      gridArea: "1 / 1",
                      visibility: isActive ? "visible" : "hidden",
                      fontSize: "clamp(22px, 2.4vw, 30px)",
                      lineHeight: 1.35,
                      color: "var(--ink)",
                      margin: 0,
                    }}
                    aria-hidden={!isActive}
                  >
                    {isActive
                      ? quoteWords.map((word, wi) => (
                          <span
                            key={wi}
                            className="animate-word-in"
                            style={{ display: "inline-block", animationDelay: `${180 + wi * 150}ms` }}
                          >
                            {word}&nbsp;
                          </span>
                        ))
                      : `“${t.quote}”`}
                  </p>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <span
                className="shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: active.gradient,
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
                  {active.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {active.program}
                </div>
              </div>
            </div>
          </div>

          {/* Stat card + thumbnail selector */}
          <div className="flex flex-col gap-3">
            <div
              className="text-center"
              style={{
                background: "rgba(234,245,242,0.9)",
                backdropFilter: "blur(6px)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                className="font-display"
                style={{ fontSize: 26, color: "var(--teal-deep)" }}
              >
                {active.result}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  marginTop: 4,
                }}
              >
                Result
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-3">
              {others.map((t) => {
                const index = testimonials.indexOf(t);
                return (
                  <button
                    key={t.name}
                    onClick={() => setActiveIndex(index)}
                    className="flex flex-col items-center text-center gap-2"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(6px)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="shrink-0"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: t.gradient,
                      }}
                    />
                    <div style={{ fontSize: 11 }}>
                      <div style={{ color: "var(--ink-muted)", fontWeight: 500 }}>
                        {t.name}
                      </div>
                      <div style={{ color: "var(--ink-faint)" }}>{t.program}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
