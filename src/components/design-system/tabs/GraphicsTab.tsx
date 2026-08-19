import {
  Syringe,
  Sparkles,
  Leaf,
  Stethoscope,
  CircleCheck,
  LayoutGrid,
  Mail,
  Truck,
  Package,
  Sun,
  Moon,
  CheckCircle2,
  Plus,
  ArrowRight,
  Gift,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";

const ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Syringe", Icon: Syringe },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Leaf", Icon: Leaf },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "CircleCheck", Icon: CircleCheck },
  { name: "LayoutGrid", Icon: LayoutGrid },
  { name: "Mail", Icon: Mail },
  { name: "Truck", Icon: Truck },
  { name: "Package", Icon: Package },
  { name: "Sun", Icon: Sun },
  { name: "Moon", Icon: Moon },
  { name: "CheckCircle2", Icon: CheckCircle2 },
  { name: "Plus", Icon: Plus },
  { name: "ArrowRight", Icon: ArrowRight },
  { name: "Gift", Icon: Gift },
  { name: "PhoneCall", Icon: PhoneCall },
];

export default function GraphicsTab() {
  return (
    <div className="flex flex-col gap-12 max-w-5xl">
      <div
        className="text-[12px] px-4 py-3 rounded-[4px]"
        style={{ background: "var(--teal-pale)", color: "var(--teal-dark)" }}
      >
        Placeholder — this tab will be revised once Ed&apos;s own reference screenshots come in.
        For now it&apos;s the lucide icons already in use across the app, plus the wordmark.
      </div>

      <section>
        <div
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--teal)" }}
        >
          Icons in use (lucide-react)
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 py-4 rounded-[4px]"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <Icon size={22} strokeWidth={1.5} color="var(--teal-dark)" />
              <span className="text-[9.5px]" style={{ color: "var(--ink-faint)" }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--teal)" }}
        >
          Logo
        </div>
        <div
          className="flex items-center px-8 py-6 rounded-[4px]"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", width: "fit-content" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vitalstats_logo_horizontal.png"
            alt="VitalStats"
            style={{ height: 40, width: "auto" }}
          />
        </div>
      </section>
    </div>
  );
}
