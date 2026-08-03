"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";

const steps = [
  {
    step: "01",
    title: "Inquiry & Consultation",
    desc: "Submit your inquiry via our contact form or Facebook. Our clinical team reviews your health profile and goals.",
    icon: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
  },
  {
    step: "02",
    title: "Program Design",
    desc: "A personalized wellness plan is crafted — selecting the right products, dosage, and schedule for you.",
    icon: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  },
  {
    step: "03",
    title: "Supervised Treatment",
    desc: "Your program is administered and monitored by licensed professionals with regular progress check-ins.",
    icon: <path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" />,
  },
  {
    step: "04",
    title: "Ongoing Optimization",
    desc: "We track outcomes and adjust your protocol to ensure you reach your goals safely and effectively.",
    icon: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  },
];

function Arrow({ direction }: { direction: "right" | "down" }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ color: "var(--teal)" }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          direction === "right"
            ? { width: 20, height: 20 }
            : { width: 20, height: 20, transform: "rotate(90deg)" }
        }
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  );
}

function StepIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: "var(--teal)",
        marginBottom: 18,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 18, height: 18 }}
      >
        {icon}
      </svg>
    </div>
  );
}

// Mobile carousel sizing — the connector arrow lives inside the track as its
// own flex item between cards (not a separate section), so SLIDE_STEP (the
// drag/snap distance) has to include the arrow's width + the gaps on both
// sides of it, on top of the card width itself.
const CARD_WIDTH = 248;
const CARD_GAP = 10;
const ARROW_WIDTH = 26;
const SLIDE_STEP = CARD_WIDTH + ARROW_WIDTH + CARD_GAP * 2;

export default function HowItWorks() {
  const [activeSlide, setActiveSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Mobile/tablet swipe carousel (below md) — copied from Team's drag/snap
  // pattern (VS-51), adapted so the arrow between cards is folded into
  // SLIDE_STEP instead of every step being an even, arrow-free width.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const drag = { active: false, startX: 0, startTrackX: 0, index: 0 };

    function snapTo(i: number) {
      const clamped = Math.max(0, Math.min(steps.length - 1, i));
      drag.index = clamped;
      gsap.to(track, { x: -clamped * SLIDE_STEP, duration: 0.45, ease: "power3.out" });
      setActiveSlide(clamped);
    }

    function onDown(e: PointerEvent) {
      drag.active = true;
      drag.startX = e.clientX;
      drag.startTrackX = Number(gsap.getProperty(track, "x"));
      track!.style.cursor = "grabbing";
      track!.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      gsap.set(track, { x: drag.startTrackX + dx });
    }
    function onUp(e: PointerEvent) {
      if (!drag.active) return;
      drag.active = false;
      track!.style.cursor = "grab";
      const dx = e.clientX - drag.startX;
      if (dx < -40) snapTo(drag.index + 1);
      else if (dx > 40) snapTo(drag.index - 1);
      else snapTo(drag.index);
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    return () => {
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <section
      id="how-it-works"
      className="px-4 md:px-9 py-16"
      style={{ background: "var(--cream)" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>
            Process
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
            How it works
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              fontWeight: 400,
              color: "var(--ink-muted)",
              marginTop: 16,
              maxWidth: 420,
            }}
          >
            Every journey starts with a conversation and ends with measurable
            results.
          </p>
        </div>

        {/* Mobile/tablet — swipe carousel, one card at a time, connector
            arrows between cards inside the track (VS-97) */}
        <div className="md:hidden">
          <div style={{ overflow: "hidden", margin: "0 -16px", padding: "0 16px" }}>
            <div
              ref={trackRef}
              style={{ display: "flex", alignItems: "stretch", gap: CARD_GAP, cursor: "grab", touchAction: "pan-y" }}
            >
              {steps.map((s, i) => (
                <Fragment key={s.step}>
                  <div
                    style={{
                      flex: `0 0 ${CARD_WIDTH}px`,
                      background: "var(--teal-pale)",
                      borderRadius: 16,
                      padding: "24px 20px",
                      userSelect: "none",
                    }}
                  >
                    <StepIcon icon={s.icon} />
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--teal)",
                        marginBottom: 8,
                      }}
                    >
                      Step {s.step}
                    </div>
                    <div
                      className="font-display"
                      style={{
                        fontSize: 17,
                        fontWeight: 400,
                        lineHeight: 1.25,
                        color: "var(--ink)",
                        marginBottom: 8,
                      }}
                    >
                      {s.title}
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.65,
                        fontWeight: 400,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {s.desc}
                    </p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex items-center" style={{ flex: `0 0 ${ARROW_WIDTH}px` }}>
                      <Arrow direction="right" />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {steps.map((s, i) => (
              <span
                key={s.step}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i === activeSlide ? "var(--teal)" : "rgba(15,74,60,0.15)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Desktop — row of arrow-linked cards */}
        <div className="hidden md:flex md:items-stretch gap-4">
          {steps.map((s, i) => (
            <Fragment key={s.step}>
              {i > 0 && (
                <div className="flex items-center">
                  <Arrow direction="right" />
                </div>
              )}
              <div
                className="flex-1"
                style={{
                  background: "var(--teal-pale)",
                  borderRadius: 16,
                  padding: "26px 22px",
                  minWidth: 0,
                }}
              >
                <StepIcon icon={s.icon} />
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    marginBottom: 8,
                  }}
                >
                  Step {s.step}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 17,
                    fontWeight: 400,
                    lineHeight: 1.25,
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  {s.title}
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    fontWeight: 400,
                    color: "var(--ink-muted)",
                  }}
                >
                  {s.desc}
                </p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
