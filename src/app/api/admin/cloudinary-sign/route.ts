import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/require-admin";

// POST /api/admin/cloudinary-sign  (admin — sign Doctor's Note photo uploads)
//
// CldUploadWidget's signatureEndpoint contract: it POSTs { paramsToSign }
// and expects { signature } back. Signing here (gated by
// requireAdminSession()) is what ties the actual Cloudinary upload to an
// authenticated admin session — see VS-228, the unsigned uploadPreset this
// replaces had no server-side auth check at all.
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const { paramsToSign } = await req.json();

    // Cloudinary's signing algorithm: sort params alphabetically by key,
    // join as key=value pairs, append the API secret, then SHA-1 hash.
    // https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
    const toSign = Object.keys(paramsToSign ?? {})
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");
    const signature = crypto
      .createHash("sha1")
      .update(toSign + apiSecret)
      .digest("hex");

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("[POST /api/admin/cloudinary-sign]", error);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
