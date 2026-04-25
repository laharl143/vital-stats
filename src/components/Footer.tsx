import Image from "next/image";
import Link from "next/link";

const productLinks = [
  { label: "Weight Management", href: "/products?category=WEIGHT_MANAGEMENT" },
  { label: "Recovery & Anti-Aging", href: "/products?category=RECOVERY_ANTI_AGING" },
  { label: "Skin Care", href: "/products?category=SKIN_CARE" },
  { label: "Consultation", href: "/products?category=MEDICAL_CONSULTATION" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Legitimacy", href: "/about#legitimacy" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Medical Disclaimer", href: "/disclaimer" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

export default function Footer() {
  return (
    <footer style={{ background: "var(--ink)" }} className="px-8 md:px-16 pt-14 pb-7">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-10 pb-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Brand col */}
        <div>
          <div className="mb-4">
            <Image
              src="/logo.png"
              alt="VitalStats"
              width={130}
              height={44}
              className="h-9 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1) opacity(0.75)" }}
            />
          </div>
          <p className="text-[12px] leading-[1.75] font-light mb-5" style={{ color: "rgba(255,255,255,0.38)", maxWidth: 240 }}>
            Precision Wellness for Body & Skin. Medically guided treatments and premium skincare in the Philippines.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://facebook.com/vitalstatwellness"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] transition-colors duration-200"
              style={{ color: "var(--teal-light)" }}
            >
              📘 facebook.com/vitalstatwellness
            </a>
            <a
              href="tel:09278608705"
              className="text-[12px] transition-colors duration-200"
              style={{ color: "var(--teal-light)" }}
            >
              📞 09278608705
            </a>
          </div>
        </div>

        {/* Products */}
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Products
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {productLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[12px] font-light transition-colors duration-200" style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Company
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {companyLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[12px] font-light transition-colors duration-200" style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Legal
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {legalLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[12px] font-light transition-colors duration-200" style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.04em]" style={{ color: "rgba(255,255,255,0.22)" }}>
          © {new Date().getFullYear()} VitalStats. All rights reserved.
        </p>
        <div className="flex items-center gap-2 text-[10px] tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: "var(--teal-light)" }} />
          Philippine FDA–Approved · Clinically Guided
        </div>
      </div>
    </footer>
  );
}
