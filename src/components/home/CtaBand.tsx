"use client";

import Link from "next/link";

export default function CtaBand() {
  return (
    <section
      className="py-20 px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-10"
      style={{ background: "var(--teal)" }}
    >
      {/* Text */}
      <div>
        <div
          className="text-[11px] tracking-[0.16em] uppercase mb-3"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Ready to start?
        </div>
        <h2
          className="font-display font-light text-white leading-[1.2]"
          style={{ fontSize: "clamp(28px, 2.8vw, 36px)" }}
        >
          Message us for availability,<br />
          guidance, and ordering.
        </h2>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <a
          href="https://facebook.com/vitalstatwellness"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-medium tracking-[0.06em] uppercase px-8 py-[14px] rounded-[3px] text-center transition-opacity duration-200 hover:opacity-90"
          style={{ background: "#ffffff", color: "var(--teal-dark)" }}
        >
          📘 Message on Facebook
        </a>
        <a
          href="tel:09278608705"
          className="text-[12px] font-light tracking-[0.06em] uppercase px-7 py-[14px] rounded-[3px] text-center text-white border transition-colors duration-200"
          style={{ borderColor: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "rgba(255,255,255,0.9)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")
          }
        >
          📞 09278608705
        </a>
      </div>
    </section>
  );
}
