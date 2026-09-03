"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Construction } from "lucide-react";

const productLinks = [
  { label: "Weight Management", href: "/products?category=WEIGHT_MANAGEMENT" },
  { label: "Recovery & Anti-Aging", href: "/products?category=RECOVERY_ANTI_AGING" },
  { label: "Skin Care", href: "/products?category=SKIN_CARE" },
  { label: "Consultation", href: "/products?category=MEDICAL_CONSULTATION" },
];

// About Us / Legitimacy / Medical Disclaimer / Privacy Policy / Terms of Use
// have no page yet — comingSoon mirrors the guard Navbar already uses for
// its own /about link (see Navbar.tsx) instead of hard-404ing.
const companyLinks: { label: string; href: string; comingSoon?: boolean }[] = [
  { label: "About Us", href: "/about", comingSoon: true },
  { label: "Legitimacy", href: "/about#legitimacy", comingSoon: true },
  { label: "Contact", href: "/contact" },
];

const legalLinks: { label: string; href: string; comingSoon?: boolean }[] = [
  { label: "Medical Disclaimer", href: "/disclaimer", comingSoon: true },
  { label: "Privacy Policy", href: "/privacy", comingSoon: true },
  { label: "Terms of Use", href: "/terms", comingSoon: true },
];

// A footer nav link that swaps to a "Coming Soon" trigger button when the
// target page doesn't exist yet — same comingSoon guard Navbar uses.
function FooterLink({ label, href, comingSoon, onComingSoon }: {
  label: string;
  href: string;
  comingSoon?: boolean;
  onComingSoon: (label: string) => void;
}) {
  const style = {
    color: "var(--ink-mid)",
    textDecoration: "none",
  };
  const onMouseEnter = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = "var(--teal-deep)");
  const onMouseLeave = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = "var(--ink-mid)");

  if (comingSoon) {
    return (
      <button
        type="button"
        onClick={() => onComingSoon(label)}
        className="text-[12px] font-light transition-colors duration-200"
        style={{ ...style, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="text-[12px] font-light transition-colors duration-200"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </Link>
  );
}

export default function Footer() {
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);
  return (
    <>
    <footer
      style={{
        background: "linear-gradient(180deg, #cdf2e2 0%, var(--mint) 62.5%, var(--mint) 100%)",
      }}
      className="px-6 sm:px-10 md:px-16 lg:px-20 pt-16 pb-7"
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-10 pb-10"
        style={{ borderBottom: "1px solid rgba(13,21,18,0.12)" }}
      >
        {/* Brand col */}
        <div>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.8,
              fontWeight: 400,
              color: "var(--ink-mid)",
              maxWidth: 240,
              marginBottom: 14,
            }}
          >
            Precision Wellness for Body &amp; Skin. Medically guided treatments
            and premium skincare in the Philippines.
          </p>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.8,
              fontWeight: 400,
              color: "var(--ink-mid)",
              maxWidth: 240,
              marginBottom: 20,
            }}
          >
            We source our products from trusted and verifiable suppliers, with
            every peptide handled under strict cold chain conditions to help
            maintain product integrity throughout storage.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://www.facebook.com/vitalstatswellness"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold transition-colors duration-200"
              style={{ color: "var(--teal-deep)", textDecoration: "none" }}
            >
              facebook.com/vitalstatswellness
            </a>
            <a
              href="tel:09278608705"
              className="text-[11px] font-semibold transition-colors duration-200"
              style={{ color: "var(--teal-deep)", textDecoration: "none" }}
            >
              09278608705
            </a>
          </div>
        </div>

        {/* Products */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--teal-deep)",
              marginBottom: 20,
            }}
          >
            Products
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {productLinks.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-[12px] font-light transition-colors duration-200"
                  style={{
                    color: "var(--ink-mid)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--teal-deep)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ink-mid)")
                  }
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--teal-deep)",
              marginBottom: 20,
            }}
          >
            Company
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {companyLinks.map((l) => (
              <li key={l.label}>
                <FooterLink label={l.label} href={l.href} comingSoon={l.comingSoon} onComingSoon={setComingSoonLabel} />
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--teal-deep)",
              marginBottom: 20,
            }}
          >
            Legal
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {legalLinks.map((l) => (
              <li key={l.label}>
                <FooterLink label={l.label} href={l.href} comingSoon={l.comingSoon} onComingSoon={setComingSoonLabel} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
        <div>
          <Image
            src="/vitalstats_logo_horizontal.png"
            alt="VitalStats"
            width={2066}
            height={570}
            className="w-auto object-contain"
            style={{ height: 40, marginBottom: 10 }}
          />
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.04em",
              color: "var(--ink-mid)",
            }}
          >
            © {new Date().getFullYear()} VitalStats. All rights reserved. · Trusted &amp; Verifiable Supplier · Clinically Guided
          </p>
        </div>
        <Link
          href="/admin/login"
          className="text-[10px] tracking-[0.04em] transition-colors duration-200"
          style={{ color: "var(--ink-mid)", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-deep)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-mid)")}
        >
          Admin Portal
        </Link>
      </div>
      </div>
    </footer>

    {comingSoonLabel && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[999] flex items-center justify-center p-6"
        style={{ background: "rgba(15,74,60,0.75)", backdropFilter: "blur(3px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setComingSoonLabel(null);
        }}
      >
        <div
          className="flex flex-col items-center gap-4 text-center rounded-[14px]"
          style={{ background: "#ffffff", padding: "3rem 2.5rem", width: 380, maxWidth: "100%" }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 60, height: 60, background: "var(--teal-deep)" }}
          >
            <Construction size={26} color="#ffffff" strokeWidth={2} />
          </div>
          <div className="font-display font-bold text-[19px]" style={{ color: "var(--ink)" }}>
            {comingSoonLabel} Page Coming Soon
          </div>
          <p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
            We&apos;re still building this page, wait for announcement.
          </p>
          <button
            type="button"
            onClick={() => setComingSoonLabel(null)}
            className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[12px] rounded-[3px] text-white"
            style={{ background: "var(--teal)" }}
          >
            Got it
          </button>
        </div>
      </div>
    )}
    </>
  );
}
