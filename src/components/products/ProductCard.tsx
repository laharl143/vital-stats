"use client";

import Link from "next/link";
import { Syringe, Sparkles, Leaf, Stethoscope, CircleCheck, type LucideIcon } from "lucide-react";
import { CATEGORY_LABELS, formatPrice } from "@/lib/product-labels";

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

const gradients: Record<string, string> = {
  WEIGHT_MANAGEMENT: "linear-gradient(135deg, #EAF5F2, #9FE1CB)",
  RECOVERY_ANTI_AGING: "linear-gradient(135deg, #EAF0F5, #B8D4E8)",
  SKIN_CARE: "linear-gradient(135deg, #F0F5EA, #C8DFA0)",
  MEDICAL_CONSULTATION: "linear-gradient(135deg, #F5EAF0, #DFA0C8)",
};

const categoryIcon: Record<string, LucideIcon> = {
  WEIGHT_MANAGEMENT: Syringe,
  RECOVERY_ANTI_AGING: Sparkles,
  SKIN_CARE: Leaf,
  MEDICAL_CONSULTATION: Stethoscope,
};

export default function ProductCard({ product }: { product: Product }) {
  const CategoryIcon = categoryIcon[product.category] ?? Leaf;
  const primaryImage = product.images[0];
  const badge = product.isBestSeller
    ? "Best Seller ✨"
    : product.deliveryMethod === "INJECTION"
    ? "Injectable"
    : product.deliveryMethod === "CONSULTATION"
    ? "Service"
    : "Topical";

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block no-underline rounded-[4px] overflow-hidden transition-all duration-250"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image / placeholder */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: 200,
          background: gradients[product.category] ?? gradients.SKIN_CARE,
        }}
      >
        {primaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage.url}
            alt={primaryImage.alt ?? product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Badge */}
        <span
          className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
          style={{ background: product.isBestSeller ? "var(--amber)" : "var(--teal)" }}
        >
          {badge}
        </span>

        {/* FDA badge */}
        {product.isFdaApproved && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 text-[9px] tracking-[0.08em] uppercase px-[8px] py-1 rounded-[2px]"
            style={{
              background: "rgba(255,255,255,0.85)",
              color: "var(--teal-dark)",
              fontWeight: 500,
            }}
          >
            FDA
            <CircleCheck size={11} strokeWidth={2} />
          </span>
        )}

        {!primaryImage && <CategoryIcon size={40} strokeWidth={1.5} color="var(--teal-dark)" />}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Category */}
        <div
          className="text-[10px] tracking-[0.12em] uppercase mb-2"
          style={{ color: "var(--teal)" }}
        >
          {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS]}
        </div>

        {/* Name */}
        <div
          className="font-display font-normal text-[22px] leading-[1.2] mb-2"
          style={{ color: "var(--ink)" }}
        >
          {product.name}
        </div>

        {/* Tagline */}
        <p
          className="text-[12px] leading-[1.65] font-light mb-5"
          style={{ color: "var(--ink-muted)" }}
        >
          {product.tagline}
        </p>

        {/* Benefits preview */}
        {product.benefits.length > 0 && (
          <div className="flex flex-wrap gap-[6px] mb-5">
            {product.benefits.slice(0, 3).map((b, i) => (
              <span
                key={i}
                className="text-[10.5px] font-semibold px-[9px] py-1 rounded-full"
                style={{ background: "var(--teal-pale)", color: "var(--teal-dark)" }}
              >
                {b.benefit}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {/* Price */}
          <div className="font-display text-[20px]" style={{ color: "var(--ink)" }}>
            {product.price ? (
              <>{formatPrice(product.price)}</>
            ) : (
              <>
                <span className="text-[11px] font-sans" style={{ color: "var(--ink-faint)" }}>
                  Price on
                </span>{" "}
                inquiry
              </>
            )}
          </div>

          {/* CTA */}
          <span
            className="text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-[2px] border transition-all duration-200 text-[var(--teal)] group-hover:bg-[var(--teal)] group-hover:text-white group-hover:border-[var(--teal)]"
            style={{
              borderColor: "var(--teal)",
            }}
          >
            {product.price ? "Order Now" : "Learn More"}
          </span>
        </div>
      </div>
    </Link>
  );
}
