"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Programs", href: "/products#programs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isSolid = scrolled || !isHome;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        padding: "0 48px",
        height:57,
        background: isSolid ? "rgba(247,249,248,0.55)" : "transparent",
        backdropFilter: isSolid ? "blur(20px) saturate(180%)" : "none",
        WebkitBackdropFilter: isSolid ? "blur(20px) saturate(180%)" : "none",
        borderBottom: isSolid
          ? "1px solid rgba(255,255,255,0.25)"
          : "1px solid transparent",
        boxShadow: isSolid ? "0 2px 24px rgba(0,0,0,0.06)" : "none",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.png"
          alt="VitalStats"
          width={130}
          height={130}
          className="w-auto object-contain"
          style={{ height: 130 }}
          priority
        />
      </Link>
      
      {/* Desktop links */}
      <ul className="hidden md:flex gap-9 list-none">
        {navLinks.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[11px] font-normal tracking-[0.1em] uppercase transition-colors duration-200"
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
        className="hidden md:inline-block text-white text-[11px] font-medium tracking-[0.08em] uppercase px-6 py-[10px] rounded-[2px] transition-opacity duration-200 hover:opacity-85"
        style={{ background: "var(--teal)" }}
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
          style={{
            background: "var(--ink)",
            transform: menuOpen ? "rotate(45deg) translate(4px, 4px)" : "none",
          }}
        />
        <span
          className="block w-5 h-[1.5px] transition-all duration-200"
          style={{ background: "var(--ink)", opacity: menuOpen ? 0 : 1 }}
        />
        <span
          className="block w-5 h-[1.5px] transition-all duration-200"
          style={{
            background: "var(--ink)",
            transform: menuOpen
              ? "rotate(-45deg) translate(4px, -4px)"
              : "none",
          }}
        />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="absolute top-[80px] left-0 right-0 flex flex-col gap-0 md:hidden"
          style={{
            background: "rgba(247,249,248,0.98)",
            borderBottom: "1px solid rgba(46,139,114,0.1)",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-8 py-4 text-[12px] tracking-[0.08em] uppercase border-b"
              style={{
                color: "var(--ink-muted)",
                borderColor: "rgba(0,0,0,0.05)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mx-8 my-4 text-center text-white text-[11px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[2px]"
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
