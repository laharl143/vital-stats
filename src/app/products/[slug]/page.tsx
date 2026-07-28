"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CldVideoPlayer } from "next-cloudinary";
import "next-cloudinary/dist/cld-video-player.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ProductImage {
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

interface ProductIngredient {
  id: string;
  name: string;
  role: string | null;
}

interface ProductBenefit {
  id: string;
  benefit: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  howItWorks: string | null;
  howAdministered: string | null;
  warnings: string | null;
  category: string;
  deliveryMethod: string;
  price: string | null;
  currency: string;
  videoPublicId: string | null;
  isBestSeller: boolean;
  isFdaApproved: boolean;
  isClinicallyGuided: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  images: ProductImage[];
  ingredients: ProductIngredient[];
  benefits: ProductBenefit[];
}

const categoryLabel: Record<string, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Medical Consultation",
};

const gradients: Record<string, string> = {
  WEIGHT_MANAGEMENT: "linear-gradient(135deg, #EAF5F2, #9FE1CB)",
  RECOVERY_ANTI_AGING: "linear-gradient(135deg, #EAF0F5, #B8D4E8)",
  SKIN_CARE: "linear-gradient(135deg, #F0F5EA, #C8DFA0)",
  MEDICAL_CONSULTATION: "linear-gradient(135deg, #F5EAF0, #DFA0C8)",
};

const emoji: Record<string, string> = {
  WEIGHT_MANAGEMENT: "💉",
  RECOVERY_ANTI_AGING: "✨",
  SKIN_CARE: "🧴",
  MEDICAL_CONSULTATION: "🩺",
};

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) setProduct(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="px-8 md:px-16 py-24" style={{ background: "var(--cream)" }}>
          <div className="animate-pulse rounded-[4px]" style={{ height: 420, background: "rgba(0,0,0,0.06)" }} />
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <Navbar />
        <main className="px-8 md:px-16 py-24 text-center" style={{ background: "var(--cream)" }}>
          <p className="font-display text-[28px] font-light" style={{ color: "var(--ink-muted)" }}>
            Product not found
          </p>
          <Link href="/products" className="text-[13px] mt-4 inline-block" style={{ color: "var(--teal)" }}>
            ← Back to all products
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <>
      <Navbar />
      <main>
        {/* Header */}
        <div
          className="px-8 md:px-16 py-16"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}
        >
          <Link
            href="/products"
            className="text-[11px] tracking-[0.1em] uppercase mb-5 inline-block"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            ← All products
          </Link>
          <div
            className="text-[11px] font-medium tracking-[0.2em] uppercase mb-3"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {categoryLabel[product.category] ?? product.category}
          </div>
          <h1
            className="font-display font-light text-white leading-[1.1] mb-4"
            style={{ fontSize: "clamp(32px, 4vw, 48px)" }}
          >
            {product.name}
          </h1>
          {product.tagline && (
            <p className="text-[15px] leading-[1.7] font-light max-w-[520px]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {product.tagline}
            </p>
          )}
        </div>

        <div className="px-8 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12" style={{ background: "var(--cream)" }}>
          {/* Main content */}
          <div className="md:col-span-2 flex flex-col gap-10">
            {/* Image / placeholder */}
            <div
              className="relative flex items-center justify-center text-[64px] rounded-[6px] overflow-hidden"
              style={{ height: 320, background: gradients[product.category] ?? gradients.SKIN_CARE }}
            >
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage.url} alt={primaryImage.alt ?? product.name} className="w-full h-full object-cover" />
              ) : (
                emoji[product.category]
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                Overview
              </h2>
              <p className="text-[14px] leading-[1.8]" style={{ color: "var(--ink-muted)" }}>
                {product.description}
              </p>
            </div>

            {/* Tutorial video */}
            {product.videoPublicId && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  Tutorial Video
                </h2>
                <div className="rounded-[6px] overflow-hidden">
                  <CldVideoPlayer
                    id={`product-video-${product.slug}`}
                    src={product.videoPublicId}
                    width="1920"
                    height="1080"
                  />
                </div>
              </div>
            )}

            {/* How it works */}
            {product.howItWorks && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  How It Works
                </h2>
                <p className="text-[14px] leading-[1.8]" style={{ color: "var(--ink-muted)" }}>
                  {product.howItWorks}
                </p>
              </div>
            )}

            {/* How administered */}
            {product.howAdministered && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  Administration
                </h2>
                <p className="text-[14px] leading-[1.8]" style={{ color: "var(--ink-muted)" }}>
                  {product.howAdministered}
                </p>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients.length > 0 && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  Key Ingredients
                </h2>
                <ul className="flex flex-col gap-3">
                  {product.ingredients.map((ing) => (
                    <li key={ing.id} className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
                      <strong style={{ color: "var(--ink)" }}>{ing.name}</strong>
                      {ing.role && <> — {ing.role}</>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {product.warnings && (
              <div
                className="p-5 rounded-[4px]"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <p className="text-[13px] leading-[1.8]" style={{ color: "var(--ink-muted)" }}>
                  ⚠️ {product.warnings}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-[6px]" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="font-display text-[28px] mb-1" style={{ color: "var(--ink)" }}>
                {product.price ? (
                  <>
                    {product.currency === "PHP" ? "₱" : product.currency}
                    {parseFloat(product.price).toLocaleString()}
                  </>
                ) : (
                  "Price on inquiry"
                )}
              </div>

              {product.isFdaApproved && (
                <div className="text-[11px] uppercase tracking-[0.08em] mb-4" style={{ color: "var(--teal)" }}>
                  FDA Approved ✓
                </div>
              )}

              {product.benefits.length > 0 && (
                <ul className="flex flex-col gap-2 mb-5">
                  {product.benefits.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start gap-2 text-[13px] font-light"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      <span
                        className="mt-[6px] w-[4px] h-[4px] rounded-full flex-shrink-0"
                        style={{ background: "var(--teal-light)" }}
                      />
                      {b.benefit}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/contact"
                className="block text-center text-[12px] font-medium tracking-[0.08em] uppercase px-6 py-3 rounded-[3px] text-white"
                style={{ background: "var(--teal)" }}
              >
                {product.price ? "Order Now" : "Inquire Now"}
              </Link>

              {product.requiresPrescription && (
                <p className="text-[11px] mt-3 text-center" style={{ color: "var(--ink-faint)" }}>
                  Requires medical consultation
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
