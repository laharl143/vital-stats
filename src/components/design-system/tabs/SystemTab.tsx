const COLOR_TOKENS: { name: string; hex: string; role: string; unused?: boolean }[] = [
  { name: "--teal", hex: "#2E8B72", role: "Brand accent — CTAs, links, active states" },
  { name: "--teal-dark", hex: "#1D6B57", role: "Text on light-teal surfaces" },
  { name: "--teal-deep", hex: "#0F4A3C", role: "Hero gradient endpoint, dark surfaces" },
  { name: "--teal-light", hex: "#5CAFA0", role: "Decorative bullets, secondary accents" },
  { name: "--teal-pale", hex: "#EAF5F2", role: "Chip/pill backgrounds" },
  { name: "--mint", hex: "#6FE6B8", role: "Homepage-only decorative gradients" },
  { name: "--sage", hex: "#6B8F7E", role: "Declared but unused anywhere", unused: true },
  { name: "--amber", hex: "#B9791F", role: "Best Seller badge only (VS-17)" },
  { name: "--cream", hex: "#F7F9F8", role: "Page background" },
  { name: "--ink", hex: "#0D1512", role: "Primary text" },
  { name: "--ink-mid", hex: "#1E2B27", role: "Secondary headline color" },
  { name: "--ink-muted", hex: "#4A5754", role: "Body copy" },
  { name: "--ink-faint", hex: "#8FA39D", role: "Captions, faint labels" },
];

const RADIUS_ROLES = [
  { role: "Badges / small CTAs", value: "2px" },
  { role: "Filter pills", value: "3px" },
  { role: "Cards (small)", value: "4px" },
  { role: "Cards (medium)", value: "6px" },
  { role: "Pills / chips", value: "9999px" },
];

const DOS = [
  "Keep teal as the only brand accent — amber exists solely for “Best Seller”",
  "Use .font-display for names/headlines only; plain sans everywhere else",
  "Keep card radii small (2–6px); reserve full-round shapes for pills/chips",
  "Use var(--ink) for primary text — never literal black",
];

const DONTS = [
  "Don't add a new accent color without a stated reason",
  "Don't add drop-shadows for decoration — the only shadow is the card hover lift",
  "Don't assume .font-display renders Playfair Display — it currently doesn't (see below)",
  "Don't use 80px+ card radii — nothing in the app does this",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
      style={{ color: "var(--teal)" }}
    >
      {children}
    </div>
  );
}

export default function SystemTab() {
  return (
    <div className="flex flex-col gap-12 max-w-5xl">
      {/* Color tokens — pulled directly from globals.css :root */}
      <section>
        <SectionLabel>Color tokens</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} style={{ opacity: token.unused ? 0.5 : 1 }}>
              <div
                className="rounded-[6px] mb-2"
                style={{
                  height: 64,
                  background: token.hex,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
              <div className="text-[11px] font-semibold" style={{ color: "var(--ink)" }}>
                {token.name}
              </div>
              <div className="text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                {token.hex}
              </div>
              <div className="text-[10px] mt-1" style={{ color: token.unused ? "#b23b3b" : "var(--ink-faint)" }}>
                {token.unused ? "Unused token" : token.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography — including the real gap: .font-display references an
          unloaded Playfair Display, so it silently falls back to system serif */}
      <section>
        <SectionLabel>Typography</SectionLabel>
        <div
          className="text-[12px] px-4 py-3 rounded-[4px] mb-5"
          style={{ background: "rgba(239,68,68,0.08)", color: "#a13a3a", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <strong>Known gap:</strong> <code>.font-display</code> sets <code>&apos;Playfair Display&apos;, serif</code>
          {" "}but Playfair Display is never loaded via <code>next/font</code> — every headline using it is
          actually rendering the browser&apos;s fallback system serif. Cormorant Garamond and DM Sans are
          also loaded in <code>layout.tsx</code> but referenced nowhere.
        </div>
        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-[4px] flex items-center justify-between" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-[13px]" style={{ color: "var(--ink)" }}>Plus Jakarta Sans — default body font</span>
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--teal)" }}>Live</span>
          </div>
          <div className="p-4 rounded-[4px] flex items-center justify-between" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-[13px]" style={{ color: "var(--ink)" }}>IBM Plex Sans — .font-secure (admin)</span>
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--teal)" }}>Live</span>
          </div>
          <div className="p-4 rounded-[4px] flex items-center justify-between" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-[13px]" style={{ color: "var(--ink)" }}>.font-display (intends Playfair Display)</span>
            <span className="text-[10px] font-semibold uppercase" style={{ color: "#a13a3a" }}>Falls back</span>
          </div>
          <div className="p-4 rounded-[4px] flex items-center justify-between" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", opacity: 0.6 }}>
            <span className="text-[13px]" style={{ color: "var(--ink)" }}>Cormorant Garamond / DM Sans</span>
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--ink-faint)" }}>Unused</span>
          </div>
        </div>
      </section>

      {/* Radius roles */}
      <section>
        <SectionLabel>Radius roles</SectionLabel>
        <div className="flex flex-wrap gap-4">
          {RADIUS_ROLES.map((r) => (
            <div key={r.role} className="flex flex-col items-center gap-2">
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "var(--teal-pale)",
                  border: "1px solid var(--teal-light)",
                  borderRadius: r.value === "9999px" ? 9999 : r.value,
                }}
              />
              <div className="text-[11px] font-semibold text-center" style={{ color: "var(--ink)" }}>{r.role}</div>
              <div className="text-[10px]" style={{ color: "var(--ink-faint)" }}>{r.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons — exact styles from Navbar's CTA + ProductCard's outlined CTA */}
      <section>
        <SectionLabel>Buttons</SectionLabel>
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="inline-block text-white text-[13px] font-semibold px-7 py-[13px] rounded-full"
            style={{ background: "var(--teal)" }}
          >
            Book a Consult
          </span>
          <span
            className="text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-[2px] border"
            style={{ color: "var(--teal)", borderColor: "var(--teal)" }}
          >
            Learn More
          </span>
          <span
            className="text-[10.5px] tracking-[0.07em] uppercase px-[15px] py-2 rounded-[2px]"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Order Now
          </span>
          <span
            className="text-[12px] px-5 py-[10px] rounded-[3px] border"
            style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)" }}
          >
            Category Filter (inactive)
          </span>
        </div>
      </section>

      {/* Badges — from ProductCard's category/best-seller/FDA badges */}
      <section>
        <SectionLabel>Badges &amp; chips</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
            style={{ background: "var(--teal)" }}
          >
            Injectable
          </span>
          <span
            className="text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
            style={{ background: "var(--amber)" }}
          >
            Best Seller ✨
          </span>
          <span
            className="inline-flex items-center gap-1 text-[9px] tracking-[0.08em] uppercase px-[8px] py-1 rounded-[2px]"
            style={{ background: "rgba(255,255,255,0.85)", color: "var(--teal-dark)", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            FDA ✓
          </span>
          <span
            className="text-[10.5px] font-semibold px-[9px] py-1 rounded-full"
            style={{ background: "var(--teal-pale)", color: "var(--teal-dark)" }}
          >
            Reduce hunger and cravings
          </span>
        </div>
      </section>

      {/* Card — ProductCard's shell, minus the product data */}
      <section>
        <SectionLabel>Card &amp; elevation</SectionLabel>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-muted)" }}>
          Flat hairline border at rest; the hover lift below is the only shadow in the entire system.
        </p>
        <div
          className="rounded-[4px] overflow-hidden transition-all duration-250"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", maxWidth: 320, cursor: "pointer" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            className="h-[120px]"
            style={{ background: "linear-gradient(135deg, #EAF5F2, #9FE1CB)" }}
          />
          <div className="p-6">
            <div className="text-[10px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--teal)" }}>
              Category
            </div>
            <div className="font-display text-[21px] mb-2" style={{ color: "var(--ink)" }}>
              Product name
            </div>
            <p className="text-[12px] font-light" style={{ color: "var(--ink-muted)" }}>
              Hover this card — that lift + shadow is the only elevation effect anywhere in the app.
            </p>
          </div>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section>
        <SectionLabel>Do / Don&apos;t</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-[4px]" style={{ background: "var(--teal-pale)" }}>
            <div className="text-[11px] font-bold uppercase mb-3" style={{ color: "var(--teal-dark)" }}>Do</div>
            <ul className="flex flex-col gap-2">
              {DOS.map((d) => (
                <li key={d} className="text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-mid)" }}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="p-5 rounded-[4px]" style={{ background: "rgba(239,68,68,0.06)" }}>
            <div className="text-[11px] font-bold uppercase mb-3" style={{ color: "#a13a3a" }}>Don&apos;t</div>
            <ul className="flex flex-col gap-2">
              {DONTS.map((d) => (
                <li key={d} className="text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-mid)" }}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
        Full write-up with components, imagery, layout, and agent-prompt reference:{" "}
        <code>DESIGN_SYSTEM.md</code> in the repo root.
      </p>
    </div>
  );
}
