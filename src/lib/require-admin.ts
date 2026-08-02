import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// Call at the top of any admin-only route handler. Returns a 401
// NextResponse to short-circuit on when there's no session, or null when
// the request is authenticated and the handler can proceed (VS-99 — these
// endpoints previously had no server-side auth check at all).
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
