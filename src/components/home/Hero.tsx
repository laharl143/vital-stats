"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const dotPositions = [
  { top: "18%", left: "62%" },
  { top: "34%", left: "82%" },
  { top: "52%", left: "45%" },
  { top: "64%", left: "70%" },
  { top: "76%", left: "30%" },
  { top: "22%", left: "22%" },
];

export default function Hero() {
  const ruleRef = useRef<HTMLSpanElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);
  const thumbrailRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<Array<HTMLSpanElement | null>>([]);

  // "Quiet Drift": everything settles once, together, in a single unhurried
  // rise — the headline never animates again after landing. Afterward only
  // a few background dots drift, the photo holds a barely-there zoom, and
  // the stat pill bobs slightly. See VS-81.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = dotsRef.current.filter(Boolean) as HTMLElement[];
    if (reduceMotion) return;

    gsap.set(ruleRef.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.set([eyebrowRef.current, headlineRef.current, ctaRef.current], { autoAlpha: 0, y: 16 });
    gsap.set(cardRef.current, { autoAlpha: 0, y: 20 });
    gsap.set(statRef.current, { autoAlpha: 0, y: 16 });
    gsap.set(thumbrailRef.current, { autoAlpha: 0, y: 16 });
    gsap.set(dots, { autoAlpha: 0 });

    const idleTweens: gsap.core.Tween[] = [];
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.to(cardRef.current, { autoAlpha: 1, y: 0, duration: 1 })
      .to(ruleRef.current, { scaleX: 1, duration: 0.5 }, "-=0.6")
      .to(eyebrowRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, "<")
      .to(headlineRef.current, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.3")
      .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.35")
      .to(statRef.current, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.5")
      .to(thumbrailRef.current, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.45")
      .to(dots, { autoAlpha: 1, duration: 0.8, stagger: 0.05 }, "-=0.5")
      .add(() => {
        idleTweens.push(
          gsap.to(photoRef.current, {
            scale: 1.035,
            duration: 9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          }),
          gsap.to(statRef.current, {
            y: "+=3",
            duration: 4,
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
        className="relative px-4 md:px-9 pt-50 md:pt-53.75 2xl:pt-62.5"
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
              transform: "translateY(20%)",
              right: 0,
              background: "rgba(13,21,18,0.1)",
              borderRadius: "32px 32px 0 0",
              padding: "clamp(12px, 1.4vw, 18px) clamp(22px, 2.6vw, 34px)",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "clamp(15px, 1.4vw, 18px)",
                color: "var(--teal-deep)",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Products Available
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
              className="gsap-init font-display"
              style={{
                fontSize: "clamp(32px, 4.6vw, 56px)",
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

          {/* Thumbnail rail — desktop only */}
          <div
            ref={thumbrailRef}
            className="gsap-init hidden lg:flex absolute flex-col gap-2"
            style={{ right: "clamp(20px, 2.6vw, 32px)", top: 100 }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 110,
                  height: 78,
                  borderRadius: 10,
                  background: "var(--cream)",
                  backgroundImage:
                    "linear-gradient(rgba(46,139,114,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(46,139,114,0.1) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                  border: i === 0 ? "2px solid var(--mint)" : "1px solid rgba(46,139,114,0.15)",
                }}
              />
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
