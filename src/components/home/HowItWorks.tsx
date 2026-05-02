"use client";

const steps = [
  {
    step: "01",
    title: "Inquiry & Consultation",
    desc: "Submit your inquiry via our contact form or Facebook. Our clinical team reviews your health profile and goals.",
  },
  {
    step: "02",
    title: "Program Design",
    desc: "A personalized wellness plan is crafted — selecting the right products, dosage, and schedule for you.",
  },
  {
    step: "03",
    title: "Supervised Treatment",
    desc: "Your program is administered and monitored by licensed professionals with regular progress check-ins.",
  },
  {
    step: "04",
    title: "Ongoing Optimization",
    desc: "We track outcomes and adjust your protocol to ensure you reach your goals safely and effectively.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ background: "var(--cream)", padding: "96px 64px" }}
    >
      <div className="flex gap-20">
        {/* Left label */}
        <div style={{ flexShrink: 0, width: 220 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>
            Process
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(28px, 2.8vw, 38px)",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            How it
            <br />
            works
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              fontWeight: 400,
              color: "var(--ink-muted)",
              marginTop: 20,
            }}
          >
            Every journey starts with a conversation and ends with measurable
            results.
          </p>
        </div>

        {/* Steps */}
        <div
          className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-[2px]"
        >
          {steps.map((s, i) => (
            <div
              key={s.step}
              className="group transition-all duration-200"
              style={{
                padding: "36px 32px",
                background: "#ffffff",
                borderLeft: `2px solid ${i % 2 === 0 ? "var(--teal)" : "transparent"}`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderLeftColor = "var(--teal)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderLeftColor =
                  i % 2 === 0 ? "var(--teal)" : "transparent")
              }
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  marginBottom: 12,
                }}
              >
                Step {s.step}
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  lineHeight: 1.2,
                  color: "var(--ink)",
                  marginBottom: 10,
                }}
              >
                {s.title}
              </div>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  fontWeight: 400,
                  color: "var(--ink-muted)",
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
