"use client";

const cases = [
  {
    label: "Weight Management",
    duration: "8 weeks",
    metric: "−14 lbs",
    sub: "Tirzepatide Protocol",
  },
  {
    label: "Skin Brightening",
    duration: "6 weeks",
    metric: "+62%",
    sub: "Luméla Serum + Toner",
  },
  {
    label: "Cellular Energy",
    duration: "4 weeks",
    metric: "×3.1",
    sub: "NAD+ Therapy",
  },
];

export default function BeforeAfter() {
  return (
    <section style={{ background: "#ffffff", padding: "96px 64px" }}>
      <div style={{ marginBottom: 56 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Results
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: "clamp(32px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.12,
            color: "var(--ink)",
          }}
        >
          Measurable outcomes,
          <br />
          real clients
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--cream)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {/* Before / After image strip */}
            <div
              className="grid grid-cols-2 gap-[2px]"
              style={{ height: 220 }}
            >
              {["Before", "After"].map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center gap-2"
                  style={{
                    background:
                      label === "Before"
                        ? "rgba(200,210,208,0.4)"
                        : "rgba(92,175,160,0.18)",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 64,
                      background: "rgba(255,255,255,0.5)",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "monospace",
                      fontSize: 7,
                      color: "var(--ink-faint)",
                      textAlign: "center",
                      padding: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    client
                    <br />
                    photo
                  </div>
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color:
                        label === "Before"
                          ? "var(--ink-faint)"
                          : "var(--teal)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Info */}
            <div style={{ padding: "20px 24px" }}>
              <div
                className="flex justify-between items-baseline"
                style={{ marginBottom: 6 }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}
                >
                  {c.label}
                </span>
                <span
                  className="font-display"
                  style={{ fontSize: 28, fontWeight: 400, color: "var(--teal)" }}
                >
                  {c.metric}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {c.sub} · {c.duration}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          marginTop: 24,
          lineHeight: 1.7,
        }}
      >
        * Results vary by individual. All programs are administered under
        medical supervision.
      </p>
    </section>
  );
}
