import Link from "next/link";

const categories = [
  {
    num: "01",
    tag: "Injectable",
    name: "Weight Management",
    desc: "Tirzepatide — once-weekly GLP-1/GIP dual receptor therapy for lasting weight loss and blood sugar control.",
    href: "/products?category=WEIGHT_MANAGEMENT",
  },
  {
    num: "02",
    tag: "Injectable",
    name: "Recovery & Anti-Aging",
    desc: "NAD+ and GHK-Cu peptide therapies for cellular repair, energy, and skin regeneration.",
    href: "/products?category=RECOVERY_ANTI_AGING",
  },
  {
    num: "03",
    tag: "Topical",
    name: "Skin Care Line",
    desc: "The Luméla collection — FDA-approved brightening cleansers, serums, toners, and moisturizers.",
    href: "/products?category=SKIN_CARE",
  },
  {
    num: "04",
    tag: "Service",
    name: "Medical Consultation",
    desc: "Personalized program design with ongoing monitoring from our licensed clinical team.",
    href: "/products?category=MEDICAL_CONSULTATION",
  },
];

export default function Categories() {
  return (
    <section className="py-24 px-8 md:px-16" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-14">
        <div>
          <div
            className="flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] uppercase mb-3"
            style={{ color: "var(--teal)" }}
          >
            <span className="block w-6 h-px" style={{ background: "var(--teal)" }} />
            What we offer
          </div>
          <h2
            className="font-display font-light leading-[1.15]"
            style={{ fontSize: "clamp(32px, 3vw, 40px)", color: "var(--ink)" }}
          >
            Four pathways to<br />your best self
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden md:inline-flex text-[12px] font-medium tracking-[0.08em] uppercase pb-1 transition-all duration-200"
          style={{
            color: "var(--teal)",
            borderBottom: "1px solid var(--teal)",
          }}
        >
          View all programs →
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2px]">
        {categories.map((cat) => (
          <Link
            key={cat.num}
            href={cat.href}
            className="group flex flex-col justify-between p-9 min-h-[270px] transition-colors duration-300 cursor-pointer no-underline"
            style={{ background: "var(--cream)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--teal-pale)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--cream)")
            }
          >
            <div>
              {/* Big number */}
              <div
                className="font-display font-light leading-none mb-5"
                style={{ fontSize: 56, color: "rgba(46,139,114,0.1)" }}
              >
                {cat.num}
              </div>

              {/* Tag */}
              <span
                className="inline-block text-[9px] tracking-[0.12em] uppercase px-[9px] py-[3px] rounded-[2px] mb-3"
                style={{
                  color: "var(--teal)",
                  border: "1px solid rgba(46,139,114,0.3)",
                }}
              >
                {cat.tag}
              </span>

              {/* Name */}
              <div
                className="font-display font-normal text-[21px] leading-[1.2] mb-3"
                style={{ color: "var(--ink)" }}
              >
                {cat.name}
              </div>

              {/* Desc */}
              <p
                className="text-[12px] leading-[1.65] font-light"
                style={{ color: "var(--ink-muted)" }}
              >
                {cat.desc}
              </p>
            </div>

            {/* Arrow */}
            <div
              className="self-end text-[18px] transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1"
              style={{ color: "var(--teal)" }}
            >
              ↗
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
