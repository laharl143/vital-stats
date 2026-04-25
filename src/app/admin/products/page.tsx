"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  deliveryMethod: string;
  price: string | null;
  isActive: boolean;
  isBestSeller: boolean;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Consultation",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    fetch("/api/products?active=false")
      .then((r) => r.json())
      .then((json) => { setProducts(json.data ?? []); setLoading(false); });
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleActive = async (slug: string, currentlyActive: boolean) => {
    setToggling(slug);
    await fetch(`/api/products/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    setToggling(null);
    fetchProducts();
  };

  const toggleBestSeller = async (slug: string, current: boolean) => {
    setToggling(slug);
    await fetch(`/api/products/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBestSeller: !current }),
    });
    setToggling(null);
    fetchProducts();
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Products</h1>
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            Manage your product catalog. {products.length} total products.
          </p>
        </div>
        <a
          href="/products"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] tracking-[0.06em] uppercase px-5 py-[10px] rounded-[3px] border transition-all duration-200"
          style={{ color: "var(--teal)", borderColor: "var(--teal)" }}
        >
          View public catalog →
        </a>
      </div>

      {/* Table */}
      <div className="rounded-[8px] overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div
          className="grid px-5 py-3 text-[10px] font-medium tracking-[0.1em] uppercase"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            background: "var(--cream)",
            color: "var(--ink-faint)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div>Product</div>
          <div>Category</div>
          <div>Price</div>
          <div>Best Seller</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded animate-pulse" style={{ background: "rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
            {products.map((product) => (
              <div
                key={product.id}
                className="grid items-center px-5 py-4 gap-3"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                  opacity: product.isActive ? 1 : 0.5,
                }}
              >
                {/* Name */}
                <div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{product.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>/products/{product.slug}</div>
                </div>

                {/* Category */}
                <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                  {CATEGORY_LABELS[product.category]}
                </div>

                {/* Price */}
                <div className="text-[13px]" style={{ color: "var(--ink)" }}>
                  {product.price ? `₱${parseFloat(product.price).toLocaleString()}` : "On inquiry"}
                </div>

                {/* Best seller toggle */}
                <div>
                  <button
                    onClick={() => toggleBestSeller(product.slug, product.isBestSeller)}
                    disabled={toggling === product.slug}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-1 rounded-[2px] border transition-all duration-200"
                    style={{
                      background: product.isBestSeller ? "#FFF8E1" : "transparent",
                      color: product.isBestSeller ? "#F57F17" : "var(--ink-faint)",
                      borderColor: product.isBestSeller ? "#F57F17" : "rgba(0,0,0,0.15)",
                      cursor: toggling ? "not-allowed" : "pointer",
                    }}
                  >
                    {product.isBestSeller ? "★ Yes" : "No"}
                  </button>
                </div>

                {/* Active status */}
                <div>
                  <span
                    className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 rounded-[2px]"
                    style={product.isActive
                      ? { background: "#E8F5E9", color: "#2E7D32" }
                      : { background: "#FFEBEE", color: "#C62828" }
                    }
                  >
                    {product.isActive ? "Active" : "Hidden"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-1 rounded-[2px] border transition-all duration-200"
                    style={{ color: "var(--teal)", borderColor: "var(--teal)" }}
                  >
                    View
                  </a>
                  <button
                    onClick={() => toggleActive(product.slug, product.isActive)}
                    disabled={toggling === product.slug}
                    className="text-[10px] tracking-[0.06em] uppercase px-3 py-1 rounded-[2px] border transition-all duration-200"
                    style={{
                      color: product.isActive ? "#C62828" : "#2E7D32",
                      borderColor: product.isActive ? "#C62828" : "#2E7D32",
                      cursor: toggling ? "not-allowed" : "pointer",
                      opacity: toggling === product.slug ? 0.5 : 1,
                    }}
                  >
                    {product.isActive ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] mt-4" style={{ color: "var(--ink-faint)" }}>
        Tip: Use Hide/Show to control product visibility on the public catalog without deleting them.
      </p>
    </div>
  );
}
