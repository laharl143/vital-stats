import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
});

export const config = {
  // The bare "/admin" path (no trailing segment) doesn't match
  // "/admin/((?!login).*)" — it requires a "/" after "/admin" — so the
  // dashboard was reachable with no session at all (VS-99). Matching it
  // explicitly closes that gap.
  matcher: ["/admin", "/admin/((?!login).*)"],
};