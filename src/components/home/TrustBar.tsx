"use client";

const badges = [
  {
    label: "Verified Suppliers",
    sub: "Authentic sources",
    icon: (
      <path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" />
    ),
  },
  {
    label: "Medically Supervised",
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
    sub: "Responsible use",
    icon: <rect x="6" y="3" width="12" height="18" rx="2" />,
  },
  {
    label: "Cold-Chain Handling",
    sub: "Integrity maintained",
    icon: <path d="M12 2v20M5 6l14 12M19 6L5 18M2 12h20" />,
  },
];

export default function TrustBar() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 md:gap-5"
      style={{
        background: "linear-gradient(180deg, var(--cream) 0%, #eef7f2 100%)",
        padding: "28px 20px 40px",
      }}
    >
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-3"
          style={{
            background: "rgba(13,21,18,0.88)",
            borderRadius: 18,
            padding: "16px 22px",
            boxShadow: "0 10px 24px rgba(13,21,18,0.18)",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
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
  );
}
