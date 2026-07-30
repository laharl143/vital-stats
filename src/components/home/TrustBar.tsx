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

      {/* Desktop — floating pill cards */}
      <div className="hidden md:flex flex-wrap items-center justify-center gap-5">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-3"
            style={{
              background: "rgba(13,21,18,0.88)",
              borderRadius: 18,
              padding: "16px 22px",
              boxShadow: "0 10px 24px rgba(13,21,18,0.18)",
              width: 225,
              boxSizing: "border-box",
            }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(111,230,184,0.18)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--mint)"
                strokeWidth={1.8}
                style={{ width: 17, height: 17 }}
              >
                {b.icon}
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}
              >
                {b.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
