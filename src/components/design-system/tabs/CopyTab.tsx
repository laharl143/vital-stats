const PRINCIPLES = [
  {
    title: "Plain language, not jargon",
    body: "Say \"weight loss injection,\" not \"GLP-1 receptor agonist,\" in anything patient-facing. Clinical terms live in the Administration/Ingredients tabs, not headlines.",
  },
  {
    title: "Credible without being cold",
    body: "Lead with the medical fact (\"medically supervised,\" \"FDA approved\"), but keep the surrounding sentence warm — this is a wellness brand, not a pharmacy insert.",
  },
  {
    title: "Specific beats vague",
    body: "\"Once-a-week injection for weight loss and blood sugar control\" beats \"a revolutionary new treatment.\" Say what it does.",
  },
];

const EXAMPLES = [
  {
    source: "Homepage hero",
    eyebrow: "Precision Wellness for Body & Skin",
    line: "Clinically guided. Beautifully delivered.",
  },
  {
    source: "Products page hero",
    line: "Precision wellness, clinically delivered.",
  },
  {
    source: "Contact page hero",
    line: "We'd love to hear from you.",
  },
  {
    source: "Product tagline (Tirzepatide)",
    line: "Once-a-week injection for weight loss and blood sugar control",
  },
];

export default function CopyTab() {
  return (
    <div className="flex flex-col gap-12 max-w-3xl">
      <section>
        <div
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--teal)" }}
        >
          Voice principles
        </div>
        <div className="flex flex-col gap-4">
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="p-5 rounded-[4px]"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
                {p.title}
              </div>
              <p className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--teal)" }}
        >
          What it sounds like — real copy from the live site
        </div>
        <div className="flex flex-col gap-3">
          {EXAMPLES.map((ex) => (
            <div
              key={ex.source}
              className="p-5 rounded-[4px]"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>
                {ex.source}
              </div>
              {ex.eyebrow && (
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: "var(--teal)" }}>
                  {ex.eyebrow}
                </div>
              )}
              <div className="font-display text-[18px]" style={{ color: "var(--ink)" }}>
                {ex.line}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
