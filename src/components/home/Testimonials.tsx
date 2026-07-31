"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

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

// Soft flowing gradient waves along the bottom edge — quiet, ambient motion
// behind the pull-quote. Pure canvas, no external libraries.
function useLiquidWaveBackground(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let t = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
    }

    function wave(yBase: number, amp: number, freq: number, phase: number, color: string) {
      ctx!.beginPath();
      ctx!.moveTo(0, canvas!.height);
      for (let x = 0; x <= canvas!.width; x += 8) {
        const y = yBase + Math.sin(x * freq + phase) * amp;
        ctx!.lineTo(x, y);
      }
      ctx!.lineTo(canvas!.width, canvas!.height);
      ctx!.closePath();
      ctx!.fillStyle = color;
      ctx!.fill();
    }

    function draw() {
      t += 0.015;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const base = canvas!.height * 0.78;
      wave(base, 22 * dpr, 0.006, t, "rgba(111,230,184,0.28)");
      wave(base + 20 * dpr, 26 * dpr, 0.008, t * 1.3 + 2, "rgba(46,139,114,0.20)");
      wave(base + 42 * dpr, 18 * dpr, 0.01, t * 0.8 + 4, "rgba(15,74,60,0.14)");
      frameId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    // ResizeObserver catches content-driven height changes (layout shifts,
    // late-loading fonts) — a plain window "resize" listener misses those.
    const parent = canvas.parentElement;
    const observer = parent ? new ResizeObserver(resize) : null;
    if (parent && observer) observer.observe(parent);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [canvasRef]);
}

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
            <p
              key={`quote-${displayIndex}`}
              className="font-display"
              style={{
                fontSize: "clamp(22px, 2.4vw, 30px)",
                lineHeight: 1.35,
                color: "var(--ink)",
                marginBottom: 24,
                // Reserves room for the longest quote (currently 3 lines, e.g.
                // Dr. Ramon Villanueva's) so shorter quotes (2 lines) don't
                // shrink the block and shift the avatar/stat card/thumbnails
                // below it on every rotation. In `em` so it scales with the
                // font-size clamp above — bump the "3" if a future quote runs
                // longer than 3 lines at mobile widths.
                minHeight: "calc(1.35em * 3)",
              }}
            >
              {quoteWords.map((word, i) => (
                <span
                  key={i}
                  className="animate-word-in"
                  style={{ display: "inline-block", animationDelay: `${180 + i * 150}ms` }}
                >
                  {word}&nbsp;
                </span>
              ))}
            </p>
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
            <div className="grid grid-cols-2 gap-3">
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
