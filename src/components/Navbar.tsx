"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Programs", href: "/products#programs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const tickerItems = [
  "Precision Wellness for Body & Skin",
  "Medically Supervised",
  "Licensed Professionals",
  "Verified Suppliers",
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Hide on scroll down, reveal on scroll up — mirrors wtatennis.com's navbar behavior
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastScrollY.current && currentY > 80;
      setHidden(scrollingDown);
      if (scrollingDown) setMenuOpen(false);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-4 md:pt-8 gap-3 md:gap-4 transition-transform duration-300 ease-out"
      style={{ transform: hidden ? "translateY(-130%)" : "translateY(0)" }}
    >
      {/* Ticker — homepage only, mirrors the hero's own promo strip */}
      {isHome && (
        <div
          className="block overflow-hidden"
          style={{
            width: "26%",
            minWidth: 260,
            WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
            maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="flex whitespace-nowrap animate-marquee" style={{ width: "max-content" }}>
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="text-[11px] font-semibold tracking-[0.04em] uppercase pr-6"
                style={{ color: "rgba(15,74,60,0.65)" }}
              >
                {tickerItems.join("  •  ")} &nbsp;•&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nav pill */}
      <nav
        className="relative grid grid-cols-3 items-center md:flex md:justify-between mx-4 md:mx-8"
        style={{
          width: "calc(100% - 32px)",
          maxWidth: 1360,
          background: "rgba(255,255,255,0.898)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: 32,
          padding: "clamp(14px, 1.6vw, 20px) clamp(18px, 2.2vw, 32px)",
          zIndex: 10,
        }}
      >
        {/* Logo — centered in mobile's middle grid column, left-aligned in desktop's flex row */}
        <Link
          href="/"
          className="row-start-1 col-start-2 justify-self-center flex items-center shrink-0 md:row-auto md:col-auto md:justify-self-auto"
          style={{ height: 56 }}
        >
          <Image
            src="/vitalstats_logo_horizontal.png"
            alt="VitalStats"
            width={2066}
            height={570}
            className="w-auto object-contain"
            style={{ height: "clamp(38px, 3.8vw, 48px)", pointerEvents: "none" }}
            priority
          />
        </Link>

        {/* Desktop links */}
        <ul
          className="hidden md:flex gap-10 list-none items-center absolute left-1/2"
          style={{ transform: "translateX(-50%)" }}
        >
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-[15px] font-semibold transition-colors duration-200"
                style={{ color: "var(--ink)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink)")}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href="/book-consult"
          className="hidden md:inline-block text-white text-[13px] font-semibold px-7 py-[13px] rounded-full transition-opacity duration-200 hover:opacity-90 flex-shrink-0"
          style={{ background: "var(--teal)" }}
        >
          Book a Consult
        </Link>

        {/* Mobile left group — hamburger + search, WTA-style */}
        <div className="row-start-1 col-start-1 justify-self-start md:hidden flex items-center gap-3">
          <button
            className="flex flex-col gap-1.25 p-2"
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
                transform: menuOpen ? "rotate(-45deg) translate(4px, -4px)" : "none",
              }}
            />
          </button>
          <button className="flex items-center justify-center p-1" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile right group — notifications + account, placeholders for a future feature */}
        <div className="row-start-1 col-start-3 justify-self-end md:hidden flex items-center gap-3">
          <button className="relative flex items-center justify-center p-1" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
              <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
            </svg>
          </button>
          <button className="flex items-center justify-center p-1" aria-label="Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c1.5-3.5 5-5 7.5-5s6 1.5 7.5 5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="absolute top-full mt-3 left-0 right-0 flex flex-col gap-0 md:hidden rounded-[20px] overflow-hidden"
            style={{
              background: "rgba(247,249,248,0.98)",
              boxShadow: "0 12px 32px rgba(13,21,18,0.15)",
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
              href="/admin/login"
              className="px-8 py-4 text-[12px] tracking-[0.08em] uppercase border-b"
              style={{
                color: "var(--ink-muted)",
                borderColor: "rgba(0,0,0,0.05)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              Admin Portal
            </Link>
            <Link
              href="/book-consult"
              className="mx-8 my-4 text-center text-white text-[11px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-full"
              style={{ background: "var(--teal)" }}
              onClick={() => setMenuOpen(false)}
            >
              Book a Consult
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
