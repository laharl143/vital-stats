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
              marginBottom: 20,
            }}
          >
            Precision Wellness for Body &amp; Skin. Medically guided treatments
            and premium skincare in the Philippines.
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
            © {new Date().getFullYear()} VitalStats. All rights reserved. · Philippine FDA–Approved · Clinically Guided
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
  );
}
