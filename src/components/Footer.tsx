"use client";

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
    <footer style={{ background: "var(--ink)" }} className="px-16 pt-16 pb-7">
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-10 pb-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Brand col */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <Image
              src="/logo.png"
              alt="VitalStats"
              width={160}
              height={52}
              className="w-auto object-contain"
              style={{
                height: 52,
                filter: "brightness(0) invert(1) opacity(0.8)",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.8,
              fontWeight: 400,
              color: "rgba(255,255,255,0.35)",
              maxWidth: 240,
              marginBottom: 20,
            }}
          >
            Precision Wellness for Body &amp; Skin. Medically guided treatments
            and premium skincare in the Philippines.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://facebook.com/vitalstatwellness"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] transition-colors duration-200"
              style={{ color: "var(--teal-light)", textDecoration: "none" }}
            >
              facebook.com/vitalstatwellness
            </a>
            <a
              href="tel:09278608705"
              className="text-[11px] transition-colors duration-200"
              style={{ color: "var(--teal-light)", textDecoration: "none" }}
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
              color: "rgba(255,255,255,0.22)",
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
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--teal-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
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
              color: "rgba(255,255,255,0.22)",
              marginBottom: 20,
            }}
          >
            Company
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {companyLinks.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-[12px] font-light transition-colors duration-200"
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--teal-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
                  }
                >
                  {l.label}
                </Link>
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
              color: "rgba(255,255,255,0.22)",
              marginBottom: 20,
            }}
          >
            Legal
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {legalLinks.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-[12px] font-light transition-colors duration-200"
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--teal-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
                  }
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
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.22)",
          }}
        >
          © {new Date().getFullYear()} VitalStats. All rights reserved.
        </p>
        <div
          className="flex items-center gap-2 text-[9px] tracking-[0.12em] uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          <span
            className="rounded-full inline-block"
            style={{
              width: 5,
              height: 5,
              background: "var(--teal-light)",
            }}
          />
          Philippine FDA–Approved · Clinically Guided
        </div>
      </div>
    </footer>
  );
}
