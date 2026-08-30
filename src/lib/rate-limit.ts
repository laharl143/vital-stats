import { NextRequest } from "next/server";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

// Extracts the client IP from the standard proxy header fallback chain
// (VS-224 — previously duplicated identically in the inquiries and
// submit-form route handlers).
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Returns true once the given IP has created MAX_SUBMISSIONS_PER_WINDOW or
// more records within the last WINDOW_MS. `count` is the caller's
// model-specific Prisma count query (e.g. prisma.inquiry.count).
export async function isRateLimited(
  count: (args: { where: { ipAddress: string; createdAt: { gte: Date } } }) => Promise<number>,
  ipAddress: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const recentCount = await count({ where: { ipAddress, createdAt: { gte: windowStart } } });
  return recentCount >= MAX_SUBMISSIONS_PER_WINDOW;
}
