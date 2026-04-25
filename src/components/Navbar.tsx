"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "Products", href: "/products" },
  { label: "Programs", href: "/products#programs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-12 h-[68px]"
      style={{
        background: "rgba(248,250,249,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(46,139,114,0.1)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.png"
          alt="VitalStats"
          width={140}
          height={48}
          className="h-10 w-auto object-contain"
          priority
        />
      </Link>

      {/* Desktop links */}
      <ul className="hidden md:flex gap-9 list-none">
        {navLinks.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[12px] font-normal tracking-[0.08em] uppercase transition-colors duration-200"
              style={{ color: "var(--ink-muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--teal)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--ink-muted)")
              }
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/contact"
        className="hidden md:inline-block text-white text-[12px] font-medium tracking-[0.06em] uppercase px-6 py-[10px] rounded-[3px] transition-colors duration-200"
        style={{ background: "var(--teal)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--teal-dark)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "var(--teal)")
        }
      >
        Inquire Now
      </Link>

      {/* Mobile hamburger */}
      <button
        className="md:hidden flex flex-col gap-[5px] p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span
          className="block w-5 h-[1.5px] transition-all duration-200"
          style={{ background: "var(--ink)", transform: menuOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }}
        />
        <span
          className="block w-5 h-[1.5px] transition-all duration-200"
          style={{ background: "var(--ink)", opacity: menuOpen ? 0 : 1 }}
        />
        <span
          className="block w-5 h-[1.5px] transition-all duration-200"
          style={{ background: "var(--ink)", transform: menuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }}
        />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="absolute top-[68px] left-0 right-0 flex flex-col gap-0 md:hidden"
          style={{ background: "rgba(248,250,249,0.98)", borderBottom: "1px solid rgba(46,139,114,0.1)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-8 py-4 text-[13px] tracking-[0.06em] uppercase border-b"
              style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.05)" }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mx-8 my-4 text-center text-white text-[12px] font-medium tracking-[0.06em] uppercase px-6 py-3 rounded-[3px]"
            style={{ background: "var(--teal)" }}
            onClick={() => setMenuOpen(false)}
          >
            Inquire Now
          </Link>
        </div>
      )}
    </nav>
  );
}
