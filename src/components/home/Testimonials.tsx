"use client";

const testimonials = [
  {
    name: "Maria S.",
    program: "Weight Management",
    result: "−14 lbs in 8 weeks",
    quote:
      "The Tirzepatide program completely changed my relationship with food. I finally have energy again and the weight is staying off.",
  },
  {
    name: "Dr. Reyes",
    program: "Recovery & Anti-Aging",
    result: "NAD+ Protocol",
    quote:
      "As a physician myself, I was skeptical. The clinical oversight and verified sourcing made me confident. The results on my cellular energy levels were remarkable.",
  },
  {
    name: "Angela T.",
    program: "Luméla Skin Care",
    result: "6-week protocol",
    quote:
      "My dermatologist noticed the difference before I even told her what I changed. Luméla has been extraordinary for my hyperpigmentation.",
  },
];

export default function Testimonials() {
  return (
    <section style={{ background: "var(--cream)", padding: "96px 64px" }}>
      <div style={{ marginBottom: 56 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Client stories
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
          What our clients say
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="flex flex-col gap-5"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.05)",
              borderRadius: 3,
              padding: "32px 28px",
            }}
          >
            {/* Quote mark */}
            <div
              className="font-display"
              style={{
                fontSize: 48,
                fontWeight: 400,
                color: "rgba(46,139,114,0.12)",
                lineHeight: 1,
                marginTop: -8,
              }}
            >
              &ldquo;
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                fontWeight: 400,
                color: "var(--ink-muted)",
                marginTop: -24,
              }}
            >
              {t.quote}
            </p>
            <div
              className="flex justify-between items-end"
              style={{
                paddingTop: 16,
                borderTop: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    marginTop: 2,
                  }}
                >
                  {t.program}
                </div>
              </div>
              <div
                className="font-display text-right"
                style={{ fontSize: 20, color: "var(--teal)" }}
              >
                {t.result}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
