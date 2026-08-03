"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SearchBackdrop from "@/components/SearchBackdrop";
import { useProductSearch } from "@/lib/useProductSearch";

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

const searchCategoryLabel: Record<string, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Medical Consultation",
};

const searchCategoryEmoji: Record<string, string> = {
  WEIGHT_MANAGEMENT: "💉",
  RECOVERY_ANTI_AGING: "✨",
  SKIN_CARE: "🧴",
  MEDICAL_CONSULTATION: "🩺",
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [pillHeight, setPillHeight] = useState<number | null>(null);
  const { query, setQuery, results, loading } = useProductSearch(searchOpen);

  function openSearch() {
    // Measure the pill's current (normal-mode) height before swapping its
    // content, so search mode can be locked to that exact value.
    setPillHeight(navRef.current?.getBoundingClientRect().height ?? null);
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
  }

  function goToAllSearchResults() {
    const q = query.trim();
    if (!q) return;
    closeSearch();
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  // Autofocus the input the moment search mode opens.
  useEffect(() => {
    if (!searchOpen) return;
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [searchOpen]);

  // Hide on scroll down, reveal on scroll up — mirrors wtatennis.com's navbar behavior
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastScrollY.current && currentY > 80;
      setHidden(scrollingDown);
      setScrolled(currentY > 80);
      if (scrollingDown) setMenuOpen(false);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // Fragment, not a single wrapper: SearchBackdrop must render as a sibling
    // of the transformed nav div below, not a child of it — `transform` on
    // an ancestor creates a new containing block for `position: fixed`
    // descendants, which would shrink the backdrop's `inset-0` down to the
    // navbar's own (short) box instead of the real viewport.
    <>
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-3 md:gap-4 transition-[transform,padding] duration-300 ease-out ${
        scrolled ? "pt-0" : "pt-4 md:pt-8"
      }`}
      style={{ transform: hidden ? "translateY(-130%)" : "translateY(0)" }}
    >
      {/* Ticker — homepage only, mirrors the hero's own promo strip; hidden once scrolled past the top */}
      {isHome && !scrolled && (
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

      {/* Nav pill — in search mode its content is replaced (not covered by
          a second bar): logo/links/icons/CTA fade out, the search input
          fades in in their place, same pill, same position. */}
      <nav
        ref={navRef}
        className={
          searchOpen
            ? "relative flex items-center gap-3 mx-4 md:mx-8"
            : "relative grid grid-cols-3 items-center md:flex md:justify-between mx-4 md:mx-8"
        }
        style={{
          width: "calc(100% - 32px)",
          maxWidth: 1360,
          // Locked to the pill's own normal-mode height (captured the
          // moment search opens — see openSearch()) so search mode's
          // shorter content — its tallest element, the 28px close button,
          // is smaller than the CTA button that normally sets this height —
          // renders at the exact same height and corner rounding instead of
          // a shorter, more fully-rounded-looking pill.
          minHeight: pillHeight ?? undefined,
          background: "rgba(255,255,255,0.898)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: 32,
          padding: "clamp(14px, 1.6vw, 20px) clamp(18px, 2.2vw, 32px)",
          zIndex: 10,
        }}
      >
        {searchOpen ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth={1.8} style={{ width: 20, height: 20, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToAllSearchResults();
              }}
              placeholder="Search products..."
              className="flex-1 border-none outline-none bg-transparent"
              style={{ fontSize: 15, color: "var(--ink)" }}
            />
            <button
              onClick={closeSearch}
              aria-label="Close search"
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--cream)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth={1.8} style={{ width: 14, height: 14 }}>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          <>
        {/* Logo — centered in mobile's middle grid column, hidden on desktop (a dedicated desktop logo sits in the left group below) */}
        <Link
          href="/"
          className="row-start-1 col-start-2 justify-self-center flex items-center shrink-0 md:hidden"
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

        {/* Desktop left group — logo + links, WTA-style */}
        <div className="hidden md:flex items-center gap-8 lg:gap-10 shrink-0">
          <Link href="/" className="flex items-center shrink-0" style={{ height: 48 }}>
            <Image
              src="/vitalstats_logo_horizontal.png"
              alt="VitalStats"
              width={2066}
              height={570}
              className="w-auto object-contain"
              style={{ height: "clamp(32px, 2.6vw, 40px)", pointerEvents: "none" }}
              priority
            />
          </Link>
          <ul className="flex gap-5 lg:gap-8 list-none items-center">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-[14px] lg:text-[15px] font-semibold transition-colors duration-200 whitespace-nowrap"
                  style={{ color: "var(--ink)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink)")}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop right group — notifications, search, account, CTA */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-3">
          <button className="relative flex items-center justify-center p-1" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
              <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
            </svg>
            <span
              className="absolute flex items-center justify-center"
              style={{
                top: -2,
                right: -2,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "var(--teal)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                border: "1.5px solid #fff",
              }}
            >
              0
            </span>
          </button>
          <button
            className="flex items-center justify-center p-1 cursor-pointer"
            aria-label="Search"
            onClick={openSearch}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
          <span style={{ width: 1, height: 20, background: "rgba(13,21,18,0.12)" }} />
          <button className="flex items-center justify-center p-1" aria-label="Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c1.5-3.5 5-5 7.5-5s6 1.5 7.5 5" strokeLinecap="round" />
            </svg>
          </button>
          </div>
          <Link
            href="/book-consult"
            className="inline-block text-white text-[13px] font-semibold px-5 lg:px-7 py-[13px] rounded-full transition-opacity duration-200 hover:opacity-90 whitespace-nowrap"
            style={{ background: "var(--teal)" }}
          >
            Book a Consult
          </Link>
        </div>

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
          <button
            className="flex items-center justify-center p-1 cursor-pointer"
            aria-label="Search"
            onClick={openSearch}
          >
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
            <span
              className="absolute flex items-center justify-center"
              style={{
                top: 0,
                right: 0,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "var(--teal)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                border: "1.5px solid #fff",
              }}
            >
              0
            </span>
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
          </>
        )}
      </nav>

      {/* Search results — same width/alignment as the nav pill, sitting
          directly under it via the wrapper's own flex gap. */}
      {searchOpen && query.trim() && (
        <div
          className="relative mx-4 md:mx-8 overflow-hidden"
          style={{
            width: "calc(100% - 32px)",
            maxWidth: 1360,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(13,21,18,0.2)",
            zIndex: 10,
          }}
        >
          {loading ? (
            <div className="px-6 py-8 text-center" style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-8 text-center" style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              No products match &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            <>
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  onClick={closeSearch}
                  className="flex items-center gap-4 px-5 py-3 no-underline transition-colors"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--teal-pale)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 text-[18px]"
                    style={{ width: 40, height: 40, borderRadius: 10, background: "var(--teal-pale)" }}
                  >
                    {searchCategoryEmoji[p.category] ?? "🧴"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                      {p.name}
                    </span>
                    <span className="block truncate" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                      {searchCategoryLabel[p.category] ?? p.category}
                    </span>
                  </span>
                  <span className="flex-shrink-0" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                    {p.price ? `₱${parseFloat(p.price).toLocaleString()}` : "Inquiry"}
                  </span>
                </Link>
              ))}
              <button
                onClick={goToAllSearchResults}
                className="w-full text-center py-3"
                style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600 }}
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>

    <SearchBackdrop open={searchOpen} onClose={closeSearch} />
    </>
  );
}
