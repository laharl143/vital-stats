import crypto from "crypto";

// Deletes an image asset from Cloudinary by public_id via a signed REST call
// to the Admin API. Best-effort: logs and swallows failures rather than
// throwing, so a Cloudinary outage never blocks the underlying DB delete.
export async function destroyCloudinaryAsset(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "[destroyCloudinaryAsset] Missing Cloudinary credentials, skipping delete for",
      publicId
    );
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      console.error(
        "[destroyCloudinaryAsset] Cloudinary destroy request failed for",
        publicId,
        await res.text()
      );
    }
  } catch (error) {
    console.error("[destroyCloudinaryAsset] Cloudinary destroy request errored for", publicId, error);
  }
}
