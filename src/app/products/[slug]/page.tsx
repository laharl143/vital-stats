"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/products/ProductCard";
import CategoryFilter from "@/components/products/CategoryFilter";

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string;
  deliveryMethod: string;
  price: string | null;
  isBestSeller: boolean;
  isFdaApproved: boolean;
  isClinicallyGuided: boolean;
  requiresPrescription: boolean;
  images: { url: string; alt: string | null }[];
  benefits: { benefit: string }[];
}

const CATEGORIES = [
  { value: "ALL", label: "All Products" },
  { value: "WEIGHT_MANAGEMENT", label: "Weight Management" },
  { value: "RECOVERY_ANTI_AGING", label: "Recovery & Anti-Aging" },
  { value: "SKIN_CARE", label: "Skin Care" },
  { value: "MEDICAL_CONSULTATION", label: "Consultation" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.data);
        setFiltered(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeCategory === "ALL") {
      setFiltered(products);
    } else {
      setFiltered(products.filter((p) => p.category === activeCategory));
    }
  }, [activeCategory, products]);

  return (
    <>
      <Navbar />
      <main>
        {/* Page header */}
        <div
          className="px-8 md:px-16 py-20"
          style={{
            background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)",
          }}
        >
          <div
            className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <span className="block w-8 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
            Our products
          </div>
          <h1
            className="font-display font-light text-white leading-[1.1] mb-4"
            style={{ fontSize: "clamp(36px, 4vw, 56px)" }}
          >
            Precision wellness,<br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>
              clinically delivered.
            </em>
          </h1>
          <p
            className="text-[14px] leading-[1.75] font-light max-w-[480px]"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            From medical-grade injectables to FDA-approved skincare — every product
            is supervised by licensed professionals and sourced from verified suppliers.
          </p>
        </div>

        {/* Filter + grid */}
        <div className="px-8 md:px-16 py-16" style={{ background: "var(--cream)" }}>
          {/* Category filter */}
          <CategoryFilter
            categories={CATEGORIES}
            active={activeCategory}
            onChange={setActiveCategory}
          />

          {/* Count */}
          <p
            className="text-[12px] tracking-[0.04em] mb-8"
            style={{ color: "var(--ink-faint)" }}
          >
            {loading ? "Loading..." : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-[4px] animate-pulse"
                  style={{ height: 360, background: "rgba(0,0,0,0.06)" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-display text-[28px] font-light" style={{ color: "var(--ink-muted)" }}>
                No products found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div
          className="px-8 md:px-16 py-10"
          style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p
            className="text-[11px] leading-[1.8] max-w-3xl"
            style={{ color: "var(--ink-faint)" }}
          >
            ⚠️ <strong>Medical Disclaimer:</strong> Injectable products (Tirzepatide, NAD+, GHK-Cu)
            are administered under medical supervision by licensed healthcare professionals only.
            These are not over-the-counter products. Results may vary. Please consult with our
            clinical team before starting any program.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
