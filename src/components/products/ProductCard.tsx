"use client";

import Link from "next/link";

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

export default function ProductCard({ product }: { product: Product }) {
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
        className="relative flex items-center justify-center text-[48px]"
        style={{
          height: 200,
          background: gradients[product.category] ?? gradients.SKIN_CARE,
        }}
      >
        {/* Badge */}
        <span
          className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
          style={{ background: "var(--teal)" }}
        >
          {badge}
        </span>

        {/* FDA badge */}
        {product.isFdaApproved && (
          <span
            className="absolute top-3 right-3 text-[9px] tracking-[0.08em] uppercase px-[8px] py-1 rounded-[2px]"
            style={{
              background: "rgba(255,255,255,0.85)",
              color: "var(--teal-dark)",
              fontWeight: 500,
            }}
          >
            FDA ✓
          </span>
        )}

        {emoji[product.category]}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Category */}
        <div
          className="text-[10px] tracking-[0.12em] uppercase mb-2"
          style={{ color: "var(--teal)" }}
        >
          {categoryLabel[product.category]}
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
          <ul className="flex flex-col gap-[6px] mb-5">
            {product.benefits.slice(0, 3).map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] font-light"
                style={{ color: "var(--ink-muted)" }}
              >
                <span
                  className="mt-[5px] w-[4px] h-[4px] rounded-full flex-shrink-0"
                  style={{ background: "var(--teal-light)" }}
                />
                {b.benefit}
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {/* Price */}
          <div className="font-display text-[20px]" style={{ color: "var(--ink)" }}>
            {product.price ? (
              <>₱{parseFloat(product.price).toLocaleString()}</>
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
            className="text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-[2px] border transition-all duration-200 group-hover:bg-[var(--teal)] group-hover:text-white group-hover:border-[var(--teal)]"
            style={{
              color: "var(--teal)",
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
