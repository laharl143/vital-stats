"use client";

const badges = [
  {
    label: "Verified Suppliers",
    short: "Verified",
    sub: "Authentic sources",
    icon: (
      <path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" />
    ),
  },
  {
    label: "Medically Supervised",
    short: "Supervised",
    sub: "Licensed oversight",
    icon: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 3v5a6 6 0 0012 0V3" />
      </>
    ),
  },
  {
    label: "Clinically Guided",
    short: "Guided",
    sub: "Responsible use",
    icon: <rect x="6" y="3" width="12" height="18" rx="2" />,
  },
  {
    label: "Cold-Chain Handling",
    short: "Cold-Chain",
    sub: "Integrity maintained",
    icon: <path d="M12 2v20M5 6l14 12M19 6L5 18M2 12h20" />,
  },
];

export default function TrustBar() {
  return (
    <div
      className="px-4 md:px-9"
      style={{
        background: "var(--cream)",
        paddingTop: 28,
        paddingBottom: 40,
      }}
    >
      {/* Mobile — scrolling marquee chips */}
      <div
        className="md:hidden overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="flex whitespace-nowrap animate-marquee" style={{ width: "max-content" }}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex" style={{ gap: 8, paddingRight: 8 }}>
              {badges.map((b, i) => (
                <div
                  key={b.label}
                  className="flex items-center"
                  style={{
                    gap: 5,
                    padding: "15px 30px",
                    borderRadius: 999,
                    background: i % 2 === 0 ? "var(--teal-pale)" : "#d6f2e6",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--teal-deep)"
                    strokeWidth={1.8}
                    style={{ width: 13, height: 13 }}
                  >
                    {b.icon}
                  </svg>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--teal-deep)",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop — outlined ghost cards */}
      <div className="hidden md:flex mx-auto" style={{ maxWidth: 1360, gap: 16 }}>
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex flex-1 flex-col items-center text-center"
            style={{
              gap: 10,
              padding: "22px 18px",
              borderRadius: 16,
              border: "1.4px solid rgba(13,21,18,0.14)",
              background: "rgba(255,255,255,0.4)",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--teal-pale)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--teal-deep)"
                strokeWidth={1.8}
                style={{ width: 16, height: 16 }}
              >
                {b.icon}
              </svg>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.03em",
                color: "var(--ink)",
              }}
            >
              {b.label}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ink-muted)",
              }}
            >
              {b.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
