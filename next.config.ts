import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [], // add cloudinary later
  },
  async headers() {
    return [
      {
        // Unhashed public/ files aren't cached aggressively by default —
        // these two are the Hero's 3D asset, so cache them hard. Safe to do
        // because Hero.tsx references them with a ?v= querystring it bumps
        // on every change, which busts this cache on its own.
        source: "/capsule-3d.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/capsule-fallback.jpg",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
