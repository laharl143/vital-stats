"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, formatPrice } from "@/lib/product-labels";

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string;
  price: string | null;
  isBestSeller: boolean;
  deliveryMethod: string;
  images: { url: string; alt: string | null }[];
  benefits: { benefit: string }[];
}

const gradients = [
  "linear-gradient(150deg, var(--mint), var(--teal))",
  "var(--teal-deep)",
  "linear-gradient(150deg, #e8c9a0, #c9986b)",
];

// Fades + slides each card in as it scrolls into view the first time,
// staggered by index. Each card is unobserved right after it reveals, so it
// stays visible and never replays on subsequent scroll-out/scroll-back-in.
function useScrollReveal(ready: boolean) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // `ready` flips true only once the cards this hook targets have actually
    // mounted (they're gated behind an async fetch) — observing before that
    // leaves refs.current empty and nothing ever reveals.
    if (!ready) return;
    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const index = refs.current.indexOf(el);
          const delay = Math.max(index, 0) * 130;
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.35 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  return (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };
}

const revealStyle: CSSProperties = {
  opacity: 0,
  transform: "translateY(24px)",
  transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
};

// Featured slugs, in display order: hero pick, then the two side cards.
const FEATURED_SLUGS = ["tirzepatide", "lumela-soap", "iv-drip"];

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((json) => {
        const all = json.data as Product[];
        const ordered = FEATURED_SLUGS.map((slug) =>
          all.find((p) => p.slug === slug)
        ).filter((p): p is Product => Boolean(p));
        setProducts(ordered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [featured, second, third] = products;
  const ready = !loading && !!featured;
  const setRevealRef = useScrollReveal(ready);

  function pauseAuto() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function resumeAuto() {
    if (!timerRef.current && ready && products.length > 1) {
      timerRef.current = setInterval(() => {
        setHeroIndex((i) => (i + 1) % products.length);
      }, 4000);
    }
  }

  useEffect(() => {
    resumeAuto();
    return pauseAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, products.length]);

  const activeIndex = products.length ? heroIndex % products.length : 0;

  return (
    <section className="px-4 md:px-9 py-16" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        {/* Header */}
        <div
          className="flex items-end justify-between"
          style={{ marginBottom: 40 }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              Featured products
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(32px, 3vw, 42px)",
                fontWeight: 400,
                lineHeight: 1.12,
                color: "var(--ink)",
              }}
            >
              Best sellers &amp;
              <br />
              staff picks
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden md:inline-flex text-[11px] font-medium tracking-[0.1em] uppercase pb-1 transition-opacity duration-200 hover:opacity-70"
            style={{
              color: "var(--teal)",
              borderBottom: "1px solid var(--teal)",
              textDecoration: "none",
            }}
          >
            View all products →
          </Link>
        </div>

        {/* Editorial split — one hero pick + two stacked side cards, scroll-triggered stagger reveal */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
            <div
              className="rounded-[16px] animate-pulse"
              style={{ height: 400, background: "rgba(0,0,0,0.06)" }}
            />
            <div className="flex flex-col gap-4">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[14px] animate-pulse"
                  style={{ minHeight: 176, background: "rgba(0,0,0,0.06)" }}
                />
              ))}
            </div>
          </div>
        ) : (
          featured && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
              {/* Hero — auto-rotating crossfade through all 3 featured picks */}
              <div
                ref={setRevealRef(0)}
                onMouseEnter={pauseAuto}
                onMouseLeave={resumeAuto}
                className="overflow-hidden"
                style={{
                  ...revealStyle,
                  display: "grid",
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {products.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="block no-underline"
                    style={{
                      gridColumn: 1,
                      gridRow: 1,
                      opacity: i === activeIndex ? 1 : 0,
                      pointerEvents: i === activeIndex ? "auto" : "none",
                      transition: "opacity 0.6s ease",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      className="relative flex items-center justify-center"
                      style={{ height: 320, background: gradients[i % gradients.length] }}
                    >
                      {p.isBestSeller && (
                        <span
                          className="absolute top-4 left-4"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "#fff",
                            background: "rgba(255,255,255,0.22)",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontWeight: 500,
                          }}
                        >
                          Best Seller
                        </span>
                      )}
                      <div
                        style={{
                          width: 60,
                          height: 80,
                          background: "rgba(255,255,255,0.5)",
                          borderRadius: 4,
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      />
                      {products.length > 1 && (
                        <div
                          className="absolute flex gap-1.5"
                          style={{ bottom: 16, right: 20, zIndex: 2 }}
                        >
                          {products.map((_, dotI) => (
                            <span
                              key={dotI}
                              style={{
                                width: dotI === activeIndex ? 16 : 6,
                                height: 6,
                                borderRadius: 3,
                                background:
                                  dotI === activeIndex
                                    ? "#fff"
                                    : "rgba(255,255,255,0.45)",
                                transition: "width 0.3s, background 0.3s",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 24 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--teal)",
                          marginBottom: 6,
                        }}
                      >
                        {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS]}
                      </div>
                      <div
                        className="font-display"
                        style={{ fontSize: 26, color: "var(--ink)", marginBottom: 8 }}
                      >
                        {p.name}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          lineHeight: 1.65,
                          color: "var(--ink-muted)",
                          marginBottom: 16,
                        }}
                      >
                        {p.tagline}
                      </p>
                      <div
                        className="flex items-center justify-between"
                        style={{ paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <div className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>
                          {formatPrice(p.price) ?? "Price on inquiry"}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            border: "1px solid var(--teal)",
                            color: "var(--teal)",
                            borderRadius: 2,
                            padding: "8px 16px",
                          }}
                        >
                          {p.price ? "Order Now" : "Learn More"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Side stack — the other two picks; each pulses in sync when the
                  hero rotates around to show that same product */}
              <div className="flex flex-col gap-4">
                {[second, third].map((p, i) => {
                  if (!p) return null;
                  const isActive = activeIndex === i + 1;
                  return (
                    <Link
                      key={p.id}
                      ref={setRevealRef(i + 1)}
                      href={`/products/${p.slug}`}
                      className="flex flex-1 no-underline"
                      style={{ ...revealStyle, textDecoration: "none" }}
                    >
                      <div
                        className="flex w-full overflow-hidden"
                        style={{
                          borderRadius: 14,
                          background: "#ffffff",
                          border: `1px solid ${isActive ? "var(--teal)" : "rgba(0,0,0,0.06)"}`,
                          boxShadow: isActive
                            ? "0 10px 28px rgba(15,74,60,0.16)"
                            : "none",
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                          transition:
                            "transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.4s ease",
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{ width: 120, background: gradients[i + 1] }}
                        />
                        <div style={{ padding: 16 }}>
                          <div
                            style={{
                              fontSize: 9.5,
                              fontWeight: 500,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--teal)",
                              marginBottom: 4,
                            }}
                          >
                            {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS]}
                          </div>
                          <div
                            className="font-display"
                            style={{ fontSize: 16, color: "var(--ink)" }}
                          >
                            {p.name}
                          </div>
                          <p
                            style={{
                              fontSize: 11,
                              lineHeight: 1.55,
                              color: "var(--ink-muted)",
                              marginTop: 4,
                            }}
                          >
                            {p.tagline}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
