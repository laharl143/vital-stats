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

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/products?active=true`, {
      next: { revalidate: 3600 }, // revalidate every hour
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Return first 3 products
    return (json.data as Product[]).slice(0, 3);
  } catch {
    return [];
  }
}

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <section className="py-24 px-8 md:px-16" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-14">
        <div>
          <div
            className="flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] uppercase mb-3"
            style={{ color: "var(--teal)" }}
          >
            <span className="block w-6 h-px" style={{ background: "var(--teal)" }} />
            Featured products
          </div>
          <h2
            className="font-display font-light leading-[1.15]"
            style={{ fontSize: "clamp(32px, 3vw, 40px)", color: "var(--ink)" }}
          >
            Best sellers &amp;<br />staff picks
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden md:inline-flex text-[12px] font-medium tracking-[0.08em] uppercase pb-1 transition-all duration-200"
          style={{ color: "var(--teal)", borderBottom: "1px solid var(--teal)" }}
        >
          View all products →
        </Link>
      </div>

      {/* Product cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product, i) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group block rounded-[4px] overflow-hidden no-underline transition-all duration-250"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Image area */}
            <div
              className="relative flex items-center justify-center h-[180px] text-[44px]"
              style={{ background: gradients[i % 3] }}
            >
              {/* Badge */}
              {product.isBestSeller && (
                <span
                  className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
                  style={{ background: "var(--teal)" }}
                >
                  Best Seller ✨
                </span>
              )}
              {!product.isBestSeller && (
                <span
                  className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase text-white px-[10px] py-1 rounded-[2px]"
                  style={{ background: "var(--teal)" }}
                >
                  {product.deliveryMethod === "INJECTION" ? "Injectable" : product.deliveryMethod === "CONSULTATION" ? "Service" : "Topical"}
                </span>
              )}
              {placeholderEmoji[product.category]}
            </div>

            {/* Body */}
            <div className="p-6">
              <div
                className="text-[10px] tracking-[0.12em] uppercase mb-2"
                style={{ color: "var(--teal)" }}
              >
                {categoryLabel[product.category]}
              </div>
              <div
                className="font-display font-normal text-[21px] leading-[1.2] mb-2"
                style={{ color: "var(--ink)" }}
              >
                {product.name}
              </div>
              <p
                className="text-[12px] leading-[1.65] font-light mb-5"
                style={{ color: "var(--ink-muted)" }}
              >
                {product.tagline}
              </p>

              {/* Footer */}
              <div
                className="flex items-center justify-between pt-4"
                style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div
                  className="font-display text-[20px]"
                  style={{ color: "var(--ink)" }}
                >
                  {product.price
                    ? `₱${parseFloat(product.price).toLocaleString()}`
                    : <span><span className="text-[12px] font-sans" style={{ color: "var(--ink-faint)" }}>Price on</span> inquiry</span>}
                </div>
                <span
                  className="text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-[2px] border transition-all duration-200"
                  style={{
                    color: "var(--teal)",
                    borderColor: "var(--teal)",
                    background: "transparent",
                  }}
                >
                  {product.price ? "Order Now" : "Learn More"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
