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
      className="px-6 py-16 sm:px-10 md:px-16 lg:px-20 md:py-24"
      style={{ background: "var(--cream)" }}
    >
      <div className="flex flex-col md:flex-row md:gap-20">
        {/* Left label */}
        <div className="mb-10 md:mb-0 md:flex-shrink-0 md:w-[220px]">
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
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
          {steps.map((s, i) => (
            <div
              key={s.step}
              className="group transition-all duration-200"
              style={{
                padding: "clamp(24px, 2.5vw, 36px) clamp(20px, 2vw, 32px)",
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
                  fontSize: "clamp(16px, 1.5vw, 20px)",
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
                  fontSize: "clamp(12px, 1.1vw, 14px)",
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