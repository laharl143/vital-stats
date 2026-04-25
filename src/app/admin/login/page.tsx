"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg("Invalid email or password.");
      setStatus("error");
    } else {
      router.push("/admin");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--teal-deep)" }}
    >
      <div
        className="w-full max-w-[400px] p-10 rounded-[12px]"
        style={{ background: "#ffffff" }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="VitalStats" width={160} height={56} className="h-12 w-auto" />
        </div>

        {/* Title */}
        <h1
          className="font-display font-light text-[28px] text-center mb-1"
          style={{ color: "var(--ink)" }}
        >
          Admin Portal
        </h1>
        <p className="text-[12px] text-center mb-8" style={{ color: "var(--ink-faint)" }}>
          Sign in to manage VitalStats
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email */}
          <div>
            <label
              className="block text-[11px] font-medium tracking-[0.1em] uppercase mb-2"
              style={{ color: "var(--ink-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="admin@vitalstats.com"
              className="w-full px-4 py-3 text-[14px] rounded-[3px] outline-none transition-all duration-200"
              style={{
                border: "1px solid rgba(0,0,0,0.15)",
                fontFamily: "inherit",
                color: "var(--ink)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-[11px] font-medium tracking-[0.1em] uppercase mb-2"
              style={{ color: "var(--ink-muted)" }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-[14px] rounded-[3px] outline-none transition-all duration-200"
              style={{
                border: "1px solid rgba(0,0,0,0.15)",
                fontFamily: "inherit",
                color: "var(--ink)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>

          {/* Error */}
          {status === "error" && (
            <div
              className="p-3 rounded-[4px] text-[13px]"
              style={{ background: "#FFEBEE", color: "#C62828" }}
            >
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-[14px] text-[12px] font-medium tracking-[0.08em] uppercase text-white rounded-[3px] transition-all duration-200 mt-2"
            style={{
              background: status === "loading" ? "var(--teal-light)" : "var(--teal)",
              cursor: status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-[11px] text-center mt-6" style={{ color: "var(--ink-faint)" }}>
          VitalStats Admin Portal — Authorized Access Only
        </p>
      </div>
    </div>
  );
}
