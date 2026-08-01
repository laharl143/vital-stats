"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const team = [
  {
    initial: "P",
    name: "Aesthetic Physician",
    role: "MD, Aesthetic Medicine",
    note: "Licensed physician overseeing all medical programs and prescriptions",
  },
  {
    initial: "T",
    name: "Medical Technologist",
    role: "RMT, Medical Technologist",
    note: "Specialized in weight management monitoring and client progress tracking",
  },
  {
    initial: "S",
    name: "Skincare Specialist",
    role: "Medical Technologist",
    note: "Luméla protocol design and skincare program oversight",
  },
];

const CARD_WIDTH = 260;
const CARD_GAP = 14;
const SLIDE_STEP = CARD_WIDTH + CARD_GAP;

export default function Team() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Mobile/tablet swipe carousel (below lg). The desktop hover-grow grid below
  // this only works safely as a single row of 3 (lg:grid-cols-3) — at sm's 2
  // columns, a growing card overlapped the row underneath it (VS-51 mobile
  // follow-up), so under lg we swap to one-card-at-a-time instead of trying
  // to port the hover interaction to a device that can't hover at all.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const drag = { active: false, startX: 0, startTrackX: 0, index: 0 };

    function snapTo(i: number) {
      const clamped = Math.max(0, Math.min(team.length - 1, i));
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
    <section className="py-24 px-4 md:px-9" style={{ background: "var(--teal-deep)" }}>
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        <div
          className="flex justify-between items-end"
          style={{ marginBottom: 56 }}
        >
          <div>
            <div className="eyebrow light" style={{ marginBottom: 16 }}>
              Our team
            </div>
            <h2
              className="font-display text-white"
              style={{
                fontSize: "clamp(32px, 3vw, 42px)",
                fontWeight: 400,
                lineHeight: 1.12,
              }}
            >
              The clinical team
              <br />
              behind your care
            </h2>
          </div>
        </div>

        {/* Mobile/tablet — swipe carousel, one card at a time */}
        <div className="lg:hidden">
          <div style={{ overflow: "hidden", margin: "0 -16px", padding: "0 16px" }}>
            <div
              ref={trackRef}
              style={{ display: "flex", gap: CARD_GAP, cursor: "grab", touchAction: "pan-y" }}
            >
              {team.map((member) => (
                <div
                  key={member.name}
                  style={{
                    flex: `0 0 ${CARD_WIDTH}px`,
                    padding: "24px 22px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8,
                    userSelect: "none",
                  }}
                >
                  <div
                    className="font-display"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 32% 28%, rgba(111,230,184,0.35), rgba(46,139,114,0.12) 60%, rgba(15,74,60,0.4) 100%)",
                      border: "1px solid rgba(92,175,160,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                      fontSize: 18,
                      fontWeight: 500,
                      color: "rgba(234,245,242,0.75)",
                      pointerEvents: "none",
                    }}
                  >
                    {member.initial}
                  </div>
                  <div
                    className="font-display text-white"
                    style={{ fontSize: 19, fontWeight: 400, marginBottom: 4 }}
                  >
                    {member.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase" as const,
                      color: "var(--teal-light)",
                      marginBottom: 12,
                    }}
                  >
                    {member.role}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                    {member.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {team.map((member, i) => (
              <span
                key={member.name}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i === activeSlide ? "var(--mint)" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Desktop — hover-grow cards, single row only */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-4">
          {team.map((member, i) => (
            <div key={member.name} className="relative">
              {/* Invisible sizer — reserves the grid's stable row height (the
                  closed-card content only, no note). The grid never sees the
                  real card's height, since that one is absolutely positioned,
                  so the row height here can never change on hover. */}
              <div
                aria-hidden
                style={{ visibility: "hidden", padding: "30px 26px", border: "1px solid transparent" }}
              >
                <div style={{ width: 56, height: 56, marginBottom: 16 }} />
                <div className="font-display" style={{ fontSize: 21, fontWeight: 400, marginBottom: 4 }}>
                  {member.name}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600 }}>{member.role}</div>
              </div>

              {/* Visible card — absolutely positioned over the sizer above, so
                  growing taller on hover (the note expanding open) overlaps
                  downward into this section's own bottom padding instead of
                  pushing the grid, or the section below, around. Safe here
                  because lg:grid-cols-3 with 3 members is always a single row. */}
              <div
                className={`team-card${openIndex === i ? " is-open" : ""}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: "30px 26px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8,
                }}
              >
                {/* Avatar mark — stands in for a portrait until real staff photos are ready */}
                <div
                  className="font-display"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 32% 28%, rgba(111,230,184,0.35), rgba(46,139,114,0.12) 60%, rgba(15,74,60,0.4) 100%)",
                    border: "1px solid rgba(92,175,160,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    fontSize: 22,
                    fontWeight: 500,
                    color: "rgba(234,245,242,0.75)",
                  }}
                >
                  {member.initial}
                </div>
                <div
                  className="font-display text-white"
                  style={{ fontSize: 21, fontWeight: 400, marginBottom: 4 }}
                >
                  {member.name}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: "var(--teal-light)",
                  }}
                >
                  {member.role}
                </div>
                <div className="team-note-wrap">
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      lineHeight: 1.65,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      paddingTop: 12,
                    }}
                  >
                    {member.note}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
