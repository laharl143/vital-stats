"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--mint) 0%, var(--mint) 55%, #bdf0da 78%, var(--cream) 100%)",
      }}
    >
      <div
        className="relative px-4 md:px-9 pt-43 md:pt-53.75 2xl:pt-62.5"
        style={{ paddingBottom: 36 }}
      >
        <div className="relative mx-auto" style={{ maxWidth: 1360 }}>
          {/* Stat widget — sits in the gap above the card, dipping slightly into its top edge */}
          <div
            className="absolute flex flex-col items-center text-center"
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
            className="relative overflow-hidden animate-fade-up"
            style={{
              zIndex: 1,
              borderRadius: 24,
              minHeight: "clamp(480px, 58vw, 640px)",
            }}
          >
          {/* Photo placeholder — swap for a real Cloudinary image when photography is ready */}
          <div
            className="absolute inset-0"
            style={{
              background: "var(--cream)",
              backgroundImage:
                "linear-gradient(rgba(46,139,114,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(46,139,114,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Headline block */}
          <div
            className="absolute left-6 right-6 md:left-11 md:right-auto"
            style={{ bottom: "clamp(28px, 4vw, 44px)", maxWidth: 620 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span style={{ width: 28, height: 1, background: "var(--teal)" }} />
              <span
                className="text-[11px] font-medium tracking-[0.22em] uppercase"
                style={{ color: "var(--teal)" }}
              >
                Precision Wellness for Body &amp; Skin
              </span>
            </div>
            <h1
              className="font-display"
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
              href="/products"
              className="inline-block text-white font-medium tracking-[0.1em] uppercase transition-opacity duration-200 hover:opacity-90"
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
            className="hidden lg:flex absolute flex-col gap-2"
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
