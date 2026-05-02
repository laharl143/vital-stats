"use client";

const badges = [
  { label: "Philippine FDA–Approved", sub: "Skincare line reviewed & certified" },
  { label: "Verified Suppliers", sub: "Authentic pharmaceutical sources" },
  { label: "Medically Supervised", sub: "Licensed professional oversight" },
  { label: "Clinically Guided", sub: "Safe & responsible product use" },
];

export default function TrustBar() {
  return (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{
        background: "var(--teal-deep)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {badges.map((b, i) => (
        <div
          key={b.label}
          className="flex flex-col items-center gap-1"
          style={{
            padding: "20px 48px",
            borderRight:
              i < badges.length - 1
                ? "1px solid rgba(255,255,255,0.07)"
                : "none",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#ffffff",
            }}
          >
            {b.label}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.04em",
            }}
          >
            {b.sub}
          </span>
        </div>
      ))}
    </div>
  );
}
