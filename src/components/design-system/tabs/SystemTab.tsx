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

const TYPE_SCALE: {
  role: string;
  size: string;
  weight: number;
  lineHeight: number;
  sample: string;
  display?: boolean;
  upper?: boolean;
}[] = [
  { role: "display", size: "56px", weight: 300, lineHeight: 1.06, sample: "Precision wellness,", display: true },
  { role: "heading", size: "32px", weight: 300, lineHeight: 1.1, sample: "Precision wellness,", display: true },
  { role: "heading-sm", size: "21px", weight: 400, lineHeight: 1.2, sample: "Tirzepatide", display: true },
  { role: "subheading", size: "24px", weight: 300, lineHeight: 1.2, sample: "How It Works", display: true },
  { role: "body", size: "13px", weight: 300, lineHeight: 1.75, sample: "Once-a-week injection for weight loss" },
  { role: "label", size: "11px", weight: 600, lineHeight: 1.2, sample: "WEIGHT MANAGEMENT", upper: true },
  { role: "eyebrow", size: "10px", weight: 500, lineHeight: 1.2, sample: "OUR PRODUCTS", upper: true },
];

const FONT_CARDS: {
  eyebrow: string;
  name: string;
  weights: string;
  sizes: string;
  lineHeight: string;
  letterSpacing: string;
  description: string;
  dim?: boolean;
}[] = [
  {
    eyebrow: "BODY",
    name: "Plus Jakarta Sans",
    weights: "300, 400, 500",
    sizes: "10–16px · used broadly",
    lineHeight: "1.2–1.85 · varies by role",
    letterSpacing: "normal – 0.22em (labels)",
    description:
      "Default body/UI font sitewide — set directly on <body> via a hardcoded font-family string, not the loaded --font-jakarta variable. Handles everything except headline names and admin-only screens.",
  },
  {
    eyebrow: "DISPLAY — BROKEN",
    name: ".font-display → Playfair Display",
    weights: "300, 400, 600 (declared)",
    sizes: "21–56px",
    lineHeight: "1.06–1.2",
    letterSpacing: "-0.01em",
    description:
      "Used for every hero H1, section heading, and product/card name — but Playfair Display is never loaded via next/font, so this class silently falls back to the browser's system serif. The rows above are rendering that real fallback, not a mockup of the intended face.",
  },
  {
    eyebrow: "ADMIN",
    name: "IBM Plex Sans",
    weights: "500, 600, 700",
    sizes: "not formally cataloged",
    lineHeight: "browser default",
    letterSpacing: "normal",
    description:
      "Applied via .font-secure in admin/secure screens only — distinct from the public site's Plus Jakarta Sans, signaling “you're in the back office” typographically.",
  },
  {
    eyebrow: "UNUSED",
    name: "Cormorant Garamond · DM Sans",
    weights: "—",
    sizes: "—",
    lineHeight: "—",
    letterSpacing: "—",
    description:
      "Loaded via next/font on every single page load, referenced by zero CSS classes or components anywhere in the codebase. Pure bundle weight — candidates for removal.",
    dim: true,
  },
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

      {/* Typography — light reference card, consistent with the rest of this
          tab. Display/heading/subheading rows use className="font-display"
          deliberately: that class currently falls back to the system serif
          (Playfair Display was never loaded), so these rows render the real,
          live result — not a mockup of the intended typeface. See the
          DISPLAY — BROKEN font card below. */}
      <section>
        <SectionLabel>Typography</SectionLabel>
        <div
          className="rounded-[6px] overflow-hidden mb-6"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>Type Scale</div>
            <div
              className="text-[11px]"
              style={{ color: "var(--ink-faint)", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
            >
              As rendered today — not a formal modular scale
            </div>
          </div>

          {TYPE_SCALE.map((row) => (
            <div
              key={row.role}
              className="px-6 py-5"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[12px]"
                  style={{ color: "var(--ink-faint)", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
                >
                  {row.role}
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--ink-faint)", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
                >
                  {row.size} · {row.weight} · {row.lineHeight}
                </span>
              </div>
              <div
                className={row.display ? "font-display" : undefined}
                style={{
                  color: "var(--ink)",
                  fontSize: row.size,
                  fontWeight: row.weight,
                  lineHeight: row.lineHeight,
                  textTransform: row.upper ? "uppercase" : "none",
                  letterSpacing: row.upper ? "0.2em" : undefined,
                }}
              >
                {row.sample}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4" style={{ color: "var(--ink-faint)" }}>
          Fonts
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FONT_CARDS.map((f) => (
            <div
              key={f.name}
              className="p-5 rounded-[4px]"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", opacity: f.dim ? 0.55 : 1 }}
            >
              <div
                className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
                style={{ color: f.eyebrow.includes("BROKEN") ? "#a13a3a" : f.dim ? "var(--ink-faint)" : "var(--teal)" }}
              >
                {f.eyebrow}
              </div>
              <div className="text-[16px] font-semibold mb-3" style={{ color: "var(--ink)" }}>
                {f.name}
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 mb-3">
                <div>
                  <div className="text-[9.5px] uppercase" style={{ color: "var(--ink-faint)" }}>Weight</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-mid)" }}>{f.weights}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase" style={{ color: "var(--ink-faint)" }}>Sizes</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-mid)" }}>{f.sizes}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase" style={{ color: "var(--ink-faint)" }}>Line height</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-mid)" }}>{f.lineHeight}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase" style={{ color: "var(--ink-faint)" }}>Letter spacing</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-mid)" }}>{f.letterSpacing}</div>
                </div>
              </div>
              <p className="text-[11.5px] leading-[1.55]" style={{ color: "var(--ink-muted)", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                {f.description}
              </p>
            </div>
          ))}
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
