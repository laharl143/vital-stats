"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const categoryLabel: Record<string, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Medical Consultation",
};

const gradients: Record<number, string> = {
  0: "linear-gradient(135deg, #EAF5F2, #9FE1CB)",
  1: "linear-gradient(135deg, #EAF0F5, #B8D4E8)",
  2: "linear-gradient(135deg, #F0F5EA, #C0DD97)",
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((json) => {
        setProducts((json.data as Product[]).slice(0, 3));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section style={{ background: "var(--cream)", padding: "96px 64px" }}>
      {/* Header */}
      <div
        className="flex items-end justify-between"
        style={{ marginBottom: 56 }}
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-[4px] animate-pulse"
              style={{ height: 380, background: "rgba(0,0,0,0.06)" }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block no-underline rounded-[4px] overflow-hidden transition-all duration-250"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.06)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 16px 40px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Image area */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  height: 200,
                  background: gradients[i % 3],
                }}
              >
                {product.isBestSeller && (
                  <span
                    className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
                    style={{ background: "var(--teal)", fontWeight: 500 }}
                  >
                    Best Seller
                  </span>
                )}
                {/* Placeholder */}
                <div
                  style={{
                    width: 60,
                    height: 80,
                    background: "rgba(255,255,255,0.5)",
                    borderRadius: 4,
                    border: "1px solid rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "var(--ink-muted)",
                    textAlign: "center",
                    padding: 6,
                    lineHeight: 1.3,
                  }}
                >
                  product
                  <br />
                  shot
                </div>
              </div>

              {/* Body */}
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
                  {categoryLabel[product.category]}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 22,
                    fontWeight: 400,
                    lineHeight: 1.2,
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  {product.name}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.7,
                    fontWeight: 400,
                    color: "var(--ink-muted)",
                    marginBottom: 20,
                  }}
                >
                  {product.tagline}
                </p>

                <div
                  className="flex items-center justify-between"
                  style={{
                    paddingTop: 16,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="font-display"
                    style={{ fontSize: 20, color: "var(--ink)" }}
                  >
                    {product.price ? (
                      `₱${parseFloat(product.price).toLocaleString()}`
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            color: "var(--ink-faint)",
                          }}
                        >
                          Price on
                        </span>{" "}
                        inquiry
                      </>
                    )}
                  </div>
                  <span
                    className="text-[10px] tracking-[0.1em] uppercase px-4 py-2 rounded-[2px] border transition-all duration-200 group-hover:bg-[var(--teal)] group-hover:text-white group-hover:border-[var(--teal)]"
                    style={{
                      color: "var(--teal)",
                      borderColor: "var(--teal)",
                      fontWeight: 500,
                    }}
                  >
                    {product.price ? "Order Now" : "Learn More"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
