"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface ProductVideo {
  id: string;
  publicId: string;
  title: string | null;
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
  isBestSeller: boolean;
  isFdaApproved: boolean;
  isClinicallyGuided: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  images: ProductImage[];
  videos: ProductVideo[];
  ingredients: ProductIngredient[];
  benefits: ProductBenefit[];
}

const categoryLabel: Record<string, string> = {
  WEIGHT_MANAGEMENT: "Weight Management",
  RECOVERY_ANTI_AGING: "Recovery & Anti-Aging",
  SKIN_CARE: "Skin Care",
  MEDICAL_CONSULTATION: "Medical Consultation",
};

const emoji: Record<string, string> = {
  WEIGHT_MANAGEMENT: "💉",
  RECOVERY_ANTI_AGING: "✨",
  SKIN_CARE: "🧴",
  MEDICAL_CONSULTATION: "🩺",
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function videoThumbUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,w_400,h_225,c_fill,q_auto/${publicId}.jpg`;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeVideo, setActiveVideo] = useState<ProductVideo | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Plain memoized lookup map, not a React ref — one stable { current } holder per
  // video, built once per video list so next-cloudinary's videoRef prop has somewhere
  // to attach the underlying <video> element for imperative play()/pause() calls.
  const videoRefs = useMemo(() => {
    const map: Record<string, { current: HTMLVideoElement | null }> = {};
    (product?.videos ?? []).forEach((v) => {
      map[v.id] = { current: null };
    });
    return map;
  }, [product?.videos]);

  const openVideo = useCallback(
    (video: ProductVideo) => {
      setActiveVideo(video);
      videoRefs[video.id]?.current?.play();
    },
    [videoRefs]
  );

  const closeVideo = useCallback(() => {
    if (activeVideo) {
      videoRefs[activeVideo.id]?.current?.pause();
    }
    setActiveVideo(null);
  }, [activeVideo, videoRefs]);

  useEffect(() => {
    if (!activeVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeVideo, closeVideo]);

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
      <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Header */}
        <div
          className="relative px-8 md:px-16 py-16 overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}
        >
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.url}
              alt=""
              className="absolute object-cover"
              style={{ right: -20, bottom: -30, width: 260, height: 260, opacity: 0.22, borderRadius: 12 }}
            />
          ) : (
            <div
              className="absolute select-none"
              style={{ right: -10, bottom: -20, fontSize: 150, opacity: 0.14, transform: "rotate(-8deg)" }}
            >
              {emoji[product.category]}
            </div>
          )}
          <div className="relative">
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
        </div>

        <div className="px-8 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12" style={{ background: "var(--cream)" }}>
          {/* Main content */}
          <div className="md:col-span-2 flex flex-col gap-8">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              {[
                { id: "overview", label: "Overview" },
                ...(product.videos.length > 0 ? [{ id: "tutorial-videos", label: "Videos" }] : []),
                ...(product.howItWorks ? [{ id: "how-it-works", label: "How It Works" }] : []),
                ...(product.howAdministered ? [{ id: "administration", label: "Administration" }] : []),
                ...(product.ingredients.length > 0 ? [{ id: "ingredients", label: "Ingredients" }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="text-[12px] font-semibold px-3 py-3 whitespace-nowrap cursor-pointer"
                  style={{
                    background: "none",
                    color: activeTab === tab.id ? "var(--teal)" : "var(--ink-muted)",
                    borderBottom: activeTab === tab.id ? "2px solid var(--teal)" : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview — bigger type scale */}
            {activeTab === "overview" && (
              <div>
                <h2 className="font-display font-light text-[26px] mb-4" style={{ color: "var(--ink)" }}>
                  Overview
                </h2>
                <p className="text-[16px] leading-[1.85] max-w-[560px]" style={{ color: "var(--ink-mid)" }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Tutorial videos — bigger type scale */}
            {activeTab === "tutorial-videos" && product.videos.length > 0 && (
              <div>
                <h2 className="font-display font-light text-[26px] mb-5" style={{ color: "var(--ink)" }}>
                  Tutorial Videos
                </h2>
                <div className="relative" style={{ maxWidth: 600, paddingLeft: 34 }}>
                  <div
                    className="absolute"
                    style={{ left: 10, top: 8, bottom: 8, width: 1.5, background: "rgba(0,0,0,0.08)" }}
                  />
                  <div className="flex flex-col gap-8">
                    {product.videos.map((video, i) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => openVideo(video)}
                        className="relative flex items-center gap-5 text-left cursor-pointer"
                        style={{ background: "none", border: "none", padding: 0 }}
                      >
                        <span
                          className="absolute flex items-center justify-center text-white text-[11px] font-semibold"
                          style={{
                            left: -34, top: 4, width: 23, height: 23, borderRadius: "50%",
                            background: "var(--teal)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <div
                          className="rounded-[4px] overflow-hidden flex-shrink-0"
                          style={{ width: 150, aspectRatio: "16/9", background: "var(--teal-deep)" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={videoThumbUrl(video.publicId)}
                            alt={video.title ?? product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          {video.title && (
                            <div className="text-[16px] font-semibold" style={{ color: "var(--ink)" }}>
                              {video.title}
                            </div>
                          )}
                          <div className="text-[12px] font-semibold mt-1" style={{ color: "var(--teal)" }}>
                            ▸ Watch tutorial
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* How it works — icon-led rows, split from the real copy's sentences */}
            {activeTab === "how-it-works" && product.howItWorks && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  How It Works
                </h2>
                <div style={{ maxWidth: 560 }}>
                  {product.howItWorks
                    .split(/(?<=[.!?])\s+/)
                    .filter((sentence) => sentence.trim().length > 0)
                    .map((sentence, i) => (
                      <div
                        key={i}
                        className="flex gap-4 py-4"
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <div
                          className="flex items-center justify-center flex-shrink-0 text-[14px] font-semibold"
                          style={{
                            width: 34, height: 34, borderRadius: 8,
                            background: "var(--teal-pale)", color: "var(--teal)",
                          }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-[14px] leading-[1.7] mt-1" style={{ color: "var(--ink-muted)" }}>
                          {sentence}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* How administered — bordered content card */}
            {activeTab === "administration" && product.howAdministered && (
              <div>
                <h2 className="font-display font-light text-[24px] mb-3" style={{ color: "var(--ink)" }}>
                  Administration
                </h2>
                <div
                  className="p-8 rounded-[8px]"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}
                >
                  <p className="text-[14px] leading-[1.8]" style={{ color: "var(--ink-muted)" }}>
                    {product.howAdministered}
                  </p>
                </div>
              </div>
            )}

            {/* Ingredients */}
            {activeTab === "ingredients" && product.ingredients.length > 0 && (
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
        </div>
      </main>
      <Footer />
      </div>

      {/* Video lightbox — all players stay permanently mounted (hidden) so each
          initializes exactly once; reopening just toggles visibility instead of
          tearing down and recreating the player (which was slow and, before that,
          unreliable on next-cloudinary's video.js singleton). */}
      {product.videos.length > 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            display: activeVideo ? "flex" : "none",
            background: "rgba(6,12,10,0.86)",
            zIndex: 1000,
            padding: "5vh 5vw",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeVideo();
          }}
        >
          <div
            className="flex flex-col items-center"
            style={{ width: "calc(88vh * 9 / 16)", maxWidth: "90vw" }}
          >
            <div className="relative w-full">
              <button
                type="button"
                onClick={closeVideo}
                aria-label="Close video"
                className="absolute flex items-center justify-center text-white"
                style={{
                  top: -48, right: 0, width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer", fontSize: 16,
                }}
              >
                ✕
              </button>
              {product.videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-[6px] overflow-hidden"
                  style={{ display: activeVideo?.id === video.id ? "block" : "none" }}
                >
                  <CldVideoPlayer
                    id={`product-video-modal-${video.id}`}
                    src={video.publicId}
                    width="1080"
                    height="1920"
                    videoRef={videoRefs[video.id]}
                  />
                </div>
              ))}
            </div>
            {activeVideo?.title && (
              <p className="text-[14px] font-medium text-white mt-4 text-center">{activeVideo.title}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
