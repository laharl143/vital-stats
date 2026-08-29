import { Category } from "@prisma/client";

// Single source of truth for how a Category enum value is displayed.
// Previously each product-facing file (ProductCard, FeaturedProducts,
// products/[slug], admin/products, Navbar) re-declared this map
// independently, and they'd drifted: admin/products showed
// MEDICAL_CONSULTATION as "Consultation" while every other surface showed
// "Medical Consultation" (VS-215).
export const CATEGORY_LABELS: Record<Category, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Medical Consultation",
};

export function formatPrice(price: string | null): string | null {
  return price ? `₱${parseFloat(price).toLocaleString()}` : null;
}
