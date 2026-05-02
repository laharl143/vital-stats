"use client";

const team = [
  {
    name: "Medical Director",
    role: "MD, Internal Medicine",
    note: "Oversees all injectable programs",
  },
  {
    name: "Clinical Advisor",
    role: "RN, Licensed Nurse",
    note: "Program monitoring & support",
  },
  {
    name: "Skincare Specialist",
    role: "Medical Technologist",
    note: "Luméla protocol design",
  },
];

export default function Team() {
  return (
    <section style={{ background: "var(--teal-deep)", padding: "96px 64px" }}>
      <div
        className="flex justify-between items-end"
        style={{ marginBottom: 56 }}
      >
        <div>
          <div className="eyebrow light" style={{ marginBottom: 16 }}>
            Our team
          </div>
          <h2
            className="font-display text-white"
            style={{
              fontSize: "clamp(32px, 3vw, 42px)",
              fontWeight: 400,
              lineHeight: 1.12,
            }}
          >
            The clinical team
            <br />
            behind your care
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <div
            key={member.name}
            style={{
              padding: "36px 32px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 3,
            }}
          >
            {/* Avatar placeholder */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(92,175,160,0.15)",
                border: "1px solid rgba(92,175,160,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                fontFamily: "monospace",
                fontSize: 8,
                color: "var(--teal-light)",
                textAlign: "center" as const,
                lineHeight: 1.3,
              }}
            >
              photo
            </div>
            <div
              className="font-display text-white"
              style={{ fontSize: 22, fontWeight: 400, marginBottom: 4 }}
            >
              {member.name}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--teal-light)",
                marginBottom: 12,
              }}
            >
              {member.role}
            </div>
            <div
              style={{
                width: 24,
                height: 1,
                background: "rgba(92,175,160,0.3)",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.6,
              }}
            >
              {member.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
