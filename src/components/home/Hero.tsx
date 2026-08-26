"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const dotPositions = [
  { top: "18%", left: "48%" },
  { top: "40%", left: "58%" },
  { top: "70%", left: "52%" },
  { top: "52%", left: "45%" },
  { top: "76%", left: "30%" },
  { top: "24%", left: "20%" },
];

const consultSteps = [
  {
    label: "Complete your intake",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="var(--teal-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="12" height="15" rx="2" />
        <path d="M7.5 3.5v-1h5v1" />
        <path d="M7 8h6M7 11.5h6M7 15h3.5" />
      </svg>
    ),
  },
  {
    label: "Clinical review",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="var(--teal-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="7" r="3" />
        <path d="M3 17c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        <path d="M13.5 8.5l1.5 1.5 3-3.5" />
      </svg>
    ),
  },
  {
    label: "Get your plan",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="var(--teal-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6.5l7-3.5 7 3.5v7l-7 3.5-7-3.5z" />
        <path d="M3 6.5l7 3.5 7-3.5" />
        <path d="M10 10v7" />
      </svg>
    ),
  },
];

export default function Hero() {
  const ruleRef = useRef<HTMLSpanElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);
  const cornerPatchRef = useRef<HTMLDivElement>(null);
  const consultRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<Array<HTMLSpanElement | null>>([]);

  // "Quiet Drift": everything settles once, together, in a single unhurried
  // rise — the headline never animates again after landing. Afterward only
  // a few background dots drift, the photo holds a barely-there zoom, and
  // the stat pill bobs slightly. See VS-81.
  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = dotsRef.current.filter(Boolean) as HTMLElement[];

    // The stat pill sits flush with the card's top edge (no dip) — the
    // corner seam is closed entirely by the static corner-patch element
    // instead, so there's nothing here for GSAP's own transforms to clobber.
    //
    // The patch's position is fixed by layout (anchored to the wrapper),
    // but the card animates its own `y` transform in — transforms don't
    // affect layout, so if the patch didn't move too, the card's *visual*
    // corner would spend the whole entrance sliding past a patch sitting at
    // its final resting spot, breaking the seam mid-animation. So the patch
    // tracks the card's motion exactly (same y, same timing), not the
    // pill's — it's structurally part of the card, not the pill.
    if (reduceMotion) return;

    gsap.set(ruleRef.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.set([eyebrowRef.current, headlineRef.current, ctaRef.current], { autoAlpha: 0, y: 16 });
    gsap.set([cardRef.current, cornerPatchRef.current], { autoAlpha: 0, y: 20 });
    gsap.set(statRef.current, { autoAlpha: 0, y: 16 });
    gsap.set(consultRef.current, { autoAlpha: 0, y: 16 });
    gsap.set(dots, { autoAlpha: 0 });

    const idleTweens: gsap.core.Tween[] = [];
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.to([cardRef.current, cornerPatchRef.current], { autoAlpha: 1, y: 0, duration: 1 })
      .to(ruleRef.current, { scaleX: 1, duration: 0.5 }, "-=0.6")
      .to(eyebrowRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, "<")
      .to(headlineRef.current, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.3")
      .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.35")
      .to(statRef.current, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.5")
      .to(consultRef.current, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.45")
      .to(dots, { autoAlpha: 1, duration: 0.8, stagger: 0.05 }, "-=0.5")
      .add(() => {
        // Deliberately not bobbing the stat pill (or the corner patch under
        // it) here — they're the one thing in the whole scene that must
        // never move again after landing.
        idleTweens.push(
          gsap.to(photoRef.current, {
            scale: 1.035,
            duration: 9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
        dots.forEach((dot, i) => {
          idleTweens.push(
            gsap.to(dot, {
              y: i % 2 ? -8 : 8,
              x: i % 3 ? 5 : -5,
              duration: 3.5 + (i % 4),
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              delay: i * 0.25,
            })
          );
        });
      });

    return () => {
      tl.kill();
      idleTweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--mint) 0%, var(--mint) 55%, #bdf0da 78%, var(--cream) 100%)",
      }}
    >
      <div
        className="relative px-4 md:px-9 pt-44 md:pt-62.5"
        style={{ paddingBottom: 36 }}
      >
        <div className="relative mx-auto" style={{ maxWidth: 1360 }}>
          {/* Stat widget — sits in the gap above the card, dipping slightly into its top edge */}
          <div
            ref={statRef}
            className="gsap-init absolute flex flex-col items-center text-center"
            style={{
              zIndex: 1,
              bottom: "100%",
              right: 0,
              background: "rgba(13,21,18,0.1)",
              borderRadius: "32px 32px 0 0",
              padding: "clamp(12px, 1.4vw, 18px) clamp(22px, 2.6vw, 34px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontWeight: 800,
                fontSize: "clamp(15px, 1.4vw, 18px)",
                color: "var(--teal-deep)",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                className="animate-live-blink"
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e",
                  flexShrink: 0,
                }}
              />
              Stocks Available
            </div>
            <div
              style={{
                fontSize: "clamp(10px, 0.9vw, 11px)",
                color: "rgba(15,74,60,0.7)",
                whiteSpace: "nowrap",
              }}
            >
              11+ Across 4 Programs
            </div>
          </div>

          {/* Corner patch — sits behind the card, at its exact top-right corner.
              The card's own border-radius is the only curve involved; it
              naturally reveals this patch only in the sliver its real curve
              recedes from, so the seam can't desync from the stat pill above
              no matter what GSAP is doing. Must stay pixel-identical to the
              card's borderRadius (24) and the stat pill's background color,
              and must never overlap the stat pill itself (it sits flush,
              with zero dip) or their matching translucent fills would stack
              and double-darken right at the boundary. Animates in lockstep
              with the card (same y, same timing) — not the pill — since its
              job is to move with the card's real corner, not the pill. */}
          <div
            ref={cornerPatchRef}
            aria-hidden
            className="gsap-init"
            style={{
              position: "absolute",
              zIndex: 0,
              top: 0,
              right: 0,
              width: 24,
              height: 24,
              background: "rgba(13,21,18,0.1)",
            }}
          />

          <div
            ref={cardRef}
            className="gsap-init relative overflow-hidden"
            style={{
              zIndex: 1,
              borderRadius: 24,
              minHeight: "clamp(480px, 58vw, 640px)",
            }}
          >
          {/* Photo placeholder — swap for a real Cloudinary image when photography is ready */}
          <div
            ref={photoRef}
            className="absolute inset-0"
            style={{
              background: "var(--cream)",
              backgroundImage:
                "linear-gradient(rgba(46,139,114,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(46,139,114,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          >
            {/* Ambient drift dots — restrained idle motion once the entrance settles */}
            {dotPositions.map((pos, i) => (
              <span
                key={i}
                ref={(el) => {
                  dotsRef.current[i] = el;
                }}
                className="gsap-init absolute"
                style={{
                  top: pos.top,
                  left: pos.left,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(46,139,114,0.35)",
                }}
              />
            ))}
          </div>
          {/* Headline block */}
          <div
            className="absolute left-6 right-6 md:left-11 md:right-auto"
            style={{ bottom: "clamp(28px, 4vw, 44px)", maxWidth: 620 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span ref={ruleRef} style={{ width: 28, height: 1, background: "var(--teal)" }} />
              <span
                ref={eyebrowRef}
                className="gsap-init text-[11px] font-medium tracking-[0.22em] uppercase"
                style={{ color: "var(--teal)" }}
              >
                Precision Wellness for Body &amp; Skin
              </span>
            </div>
            <h1
              ref={headlineRef}
              className="gsap-init"
              style={{
                // Deliberate exception (VS-157): this headline keeps the serif
                // look while .font-display elsewhere is sans-serif — Ed's
                // explicit pick, do not change without checking with him.
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(36px, 5.8vw, 74px)",
                fontWeight: 400,
                lineHeight: 1.06,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
                marginBottom: 24,
              }}
            >
              Clinically guided.
              <br />
              <em style={{ fontStyle: "italic", color: "var(--teal)" }}>Beautifully</em>
              <br />
              delivered.
            </h1>
            <Link
              ref={ctaRef}
              href="/products"
              className="gsap-init inline-block text-white font-medium tracking-[0.1em] uppercase transition-opacity duration-200 hover:opacity-90"
              style={{
                background: "var(--teal)",
                fontSize: "clamp(11px, 0.9vw, 13px)",
                padding: "clamp(13px, 1.3vw, 17px) clamp(28px, 3vw, 38px)",
                borderRadius: 999,
              }}
            >
              View Products
            </Link>
          </div>

          {/* Consult panel — desktop only (VS-157, replaces the thumbnail rail) */}
          <div
            ref={consultRef}
            className="gsap-init hidden lg:flex absolute flex-col"
            style={{
              right: "clamp(24px, 3.4vw, 44px)",
              top: 44,
              width: "clamp(300px, 29.7vw, 380px)",
              gap: 18,
              borderRadius: 16,
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 18px 40px -22px rgba(13,21,18,0.2)",
              padding: 28,
            }}
          >
            <div className="font-display" style={{ fontSize: 22, color: "var(--ink)" }}>
              Book a consult
            </div>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {consultSteps.map((step) => (
                <div key={step.label} className="flex items-center" style={{ gap: 12 }}>
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(46,139,114,0.12)" }}
                  >
                    {step.icon}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{step.label}</div>
                </div>
              ))}
            </div>
            <Link
              href="/book-consult"
              className="block text-center text-white font-medium tracking-[0.1em] uppercase transition-opacity duration-200 hover:opacity-90"
              style={{
                background: "var(--teal)",
                fontSize: 11,
                padding: "13px 26px",
                borderRadius: 999,
              }}
            >
              Start
            </Link>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
