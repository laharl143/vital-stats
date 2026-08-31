import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { clearLoginAttempts, isLoginRateLimited, recordFailedLogin } from "@/lib/login-rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as never,

  // Use JWT strategy — works well with Prisma adapter + credentials
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        code: { label: "Passcode", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.code) {
          throw new Error("Passcode is required");
        }

        // Same x-forwarded-for/x-real-ip fallback chain as the submit-form
        // and inquiries endpoints' IP-based throttling.
        const ipAddress =
          (req.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
          (req.headers?.["x-real-ip"] as string | undefined) ||
          "unknown";

        if (isLoginRateLimited(ipAddress)) {
          throw new Error("Too many attempts. Please try again later.");
        }

        // No email is collected — match the passcode against each admin's
        // own hash so distinct per-admin passcodes still resolve to the
        // correct signed-in identity (session.user.email etc still work).
        const users = await prisma.user.findMany({
          where: { hashedPassword: { not: null } },
        });

        const bcrypt = await import("bcryptjs");
        for (const user of users) {
          const isValid = await bcrypt.compare(credentials.code, user.hashedPassword ?? "");
          if (isValid) {
            clearLoginAttempts(ipAddress);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        recordFailedLogin(ipAddress);
        throw new Error("Invalid passcode");
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "ADMIN";
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "ADMIN";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
