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
  1: "linear-gradient(135deg, #F0F5EA, #C0DD97)",
  2: "linear-gradient(135deg, #EAF0F5, #B8D4E8)",
};

const placeholderEmoji: Record<string, string> = {
  WEIGHT_MANAGEMENT: "💉",
  RECOVERY_ANTI_AGING: "✨",
  SKIN_CARE: "🧴",
  MEDICAL_CONSULTATION: "🩺",
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
    <section className="py-24 px-8 md:px-16" style={{ background: "var(--cream)" }}>
      <div className="flex items-end justify-between mb-14">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] uppercase mb-3" style={{ color: "var(--teal)" }}>
            <span className="block w-6 h-px" style={{ background: "var(--teal)" }} />
            Featured products
          </div>
          <h2 className="font-display font-light leading-[1.15]" style={{ fontSize: "clamp(32px, 3vw, 40px)", color: "var(--ink)" }}>
            Best sellers &amp;<br />staff picks
          </h2>
        </div>
        <Link href="/products" className="hidden md:inline-flex text-[12px] font-medium tracking-[0.08em] uppercase pb-1" style={{ color: "var(--teal)", borderBottom: "1px solid var(--teal)" }}>
          View all products →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-[4px] animate-pulse" style={{ height: 360, background: "rgba(0,0,0,0.06)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product, i) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block no-underline rounded-[4px] overflow-hidden transition-all duration-250"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="relative flex items-center justify-center h-[180px] text-[44px]" style={{ background: gradients[i % 3] }}>
                {product.isBestSeller ? (
                  <span className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]" style={{ background: "var(--teal)" }}>
                    Best Seller ✨
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]" style={{ background: "var(--teal)" }}>
                    {product.deliveryMethod === "INJECTION" ? "Injectable" : product.deliveryMethod === "CONSULTATION" ? "Service" : "Topical"}
                  </span>
                )}
                {placeholderEmoji[product.category]}
              </div>
              <div className="p-6">
                <div className="text-[10px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--teal)" }}>
                  {categoryLabel[product.category]}
                </div>
                <div className="font-display font-normal text-[21px] leading-[1.2] mb-2" style={{ color: "var(--ink)" }}>
                  {product.name}
                </div>
                <p className="text-[12px] leading-[1.65] font-light mb-5" style={{ color: "var(--ink-muted)" }}>
                  {product.tagline}
                </p>
                <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="font-display text-[20px]" style={{ color: "var(--ink)" }}>
                    {product.price
                      ? `₱${parseFloat(product.price).toLocaleString()}`
                      : <><span className="text-[12px] font-sans" style={{ color: "var(--ink-faint)" }}>Price on</span> inquiry</>
                    }
                  </div>
                  <span className="text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-[2px] border" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
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