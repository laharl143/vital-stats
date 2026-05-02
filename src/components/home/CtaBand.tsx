"use client";

export default function CtaBand() {
  return (
    <section
      id="contact"
      className="flex flex-col md:flex-row items-center justify-between gap-12"
      style={{ background: "var(--teal)", padding: "80px 64px" }}
    >
      {/* Text */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 12,
          }}
        >
          Ready to start?
        </div>
        <h2
          className="font-display text-white"
          style={{
            fontSize: "clamp(28px, 2.8vw, 38px)",
            fontWeight: 400,
            lineHeight: 1.15,
          }}
        >
          Message us for availability,
          <br />
          guidance, and ordering.
        </h2>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <a
          href="https://facebook.com/vitalstatwellness"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-[2px] text-center transition-opacity duration-200 hover:opacity-90"
          style={{ background: "#ffffff", color: "var(--teal-dark)" }}
        >
          Message on Facebook
        </a>
        <a
          href="tel:09278608705"
          className="text-[11px] font-normal tracking-[0.08em] uppercase px-7 py-[14px] rounded-[2px] text-center text-white border transition-colors duration-200"
          style={{ borderColor: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "rgba(255,255,255,0.9)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")
          }
        >
          09278608705
        </a>
      </div>
    </section>
  );
}
