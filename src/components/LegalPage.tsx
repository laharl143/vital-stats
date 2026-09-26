import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatEffectiveDate } from "@/lib/legal";

// Shared shell for /privacy, /terms and /disclaimer (spec 0001): header band,
// version line, draft notice, and a readable prose column.
export default function LegalPage({
  eyebrow,
  title,
  version,
  children,
}: {
  eyebrow: string;
  title: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <main>
        <div
          className="px-4 md:px-9 pt-36 md:pt-44 pb-16"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}
        >
          <div className="mx-auto" style={{ maxWidth: 820 }}>
            <div
              className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <span className="block w-8 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
              {eyebrow}
            </div>
            <h1
              className="font-display font-light text-white leading-[1.1] mb-4"
              style={{ fontSize: "clamp(34px, 4vw, 52px)" }}
            >
              {title}
            </h1>
            <p className="text-[13px] font-light" style={{ color: "rgba(255,255,255,0.7)" }}>
              Effective {formatEffectiveDate(version)} · Version {version}
            </p>
          </div>
        </div>

        <div
          className="px-4 md:px-9 py-12"
          style={{ background: "linear-gradient(180deg, var(--cream) 0%, var(--cream) calc(100% - 180px), #eaf8f2 calc(100% - 60px), #cdf2e2 100%)" }}
        >
          <article
            className="mx-auto p-6 md:p-10 rounded-[6px]"
            style={{ maxWidth: 820, background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <p
              role="note"
              className="text-[12px] leading-[1.7] px-4 py-3 mb-8 rounded-[4px]"
              style={{ background: "#FFF8E1", border: "1px solid rgba(245,127,23,0.2)", color: "#5D4037" }}
            >
              Draft, pending legal review. This text is being reviewed under the Data Privacy Act of 2012
              (RA 10173) and may change. Any change gets a new version and date above.
            </p>
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>{title}</h2>
      <div className="flex flex-col gap-3 text-[14px] leading-[1.75]" style={{ color: "var(--ink-muted)" }}>
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

// Marks a fact the owner still has to supply at legal review.
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="px-1 rounded-[2px]" style={{ background: "#FFF3CD", color: "#5D4037" }}>
      [To be confirmed: {children}]
    </mark>
  );
}
