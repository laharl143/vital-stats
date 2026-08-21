"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { LayoutGrid, Mail, Stethoscope, Truck, Package, Sun, Moon, type LucideIcon } from "lucide-react";
import WebsiteShortcut from "@/components/WebsiteShortcut";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";

const NAV_ITEMS: { label: string; mobileLabel: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", mobileLabel: "Dashboard", href: "/admin", icon: LayoutGrid },
  { label: "Inquiries", mobileLabel: "Inquiries", href: "/admin/inquiries", icon: Mail },
  { label: "Consult Requests", mobileLabel: "Consults", href: "/admin/medical-history", icon: Stethoscope },
  { label: "Orders", mobileLabel: "Orders", href: "/admin/orders", icon: Truck },
  { label: "Products", mobileLabel: "Products", href: "/admin/products", icon: Package },
];

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Show just children for login page — no nav
  if (pathname === "/admin/login") {
    return (
      <>
        <WebsiteShortcut />
        {children}
      </>
    );
  }

  return (
    <AdminThemeProvider>
      <AdminLayoutShell pathname={pathname}>{children}</AdminLayoutShell>
    </AdminThemeProvider>
  );
}

function AdminLayoutShell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === "dark";
  const [newConsultRequests, setNewConsultRequests] = useState(0);

  useEffect(() => {
    fetch("/api/medical-history?status=NEW&limit=1")
      .then((r) => r.json())
      .then((res) => setNewConsultRequests(res.meta?.total ?? 0));
  }, []);

  const barBg = isDark ? "#0B1210" : "var(--teal-deep)";
  const barBorder = isDark ? "rgba(63,217,174,0.12)" : "rgba(255,255,255,0.08)";
  const activeColor = isDark ? "#3FD9AE" : "white";
  const inactiveColor = isDark ? "rgba(234,242,239,0.55)" : "rgba(255,255,255,0.55)";
  const underlineColor = isDark ? "#3FD9AE" : "white";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      <WebsiteShortcut />

      {/* Desktop top navbar — kicks in at xl (1280px): the full nav (5 items +
          toggle + email + sign out) doesn't have room to breathe below that,
          so tablet/small-laptop widths keep using the mobile top+bottom bars. */}
      <header
        className="hidden xl:flex items-center transition-colors duration-200"
        style={{ background: barBg, borderBottom: `1px solid ${barBorder}`, height: 76, padding: "0 40px", gap: 48 }}
      >
        <div className="flex items-center flex-shrink-0">
          <Image
            src="/vitalstats_logo_horizontal.png"
            alt="VitalStats"
            width={2066}
            height={570}
            className="h-9 w-auto"
            style={{ filter: "brightness(0) invert(1) opacity(0.92)" }}
            priority
          />
        </div>

        <nav className="flex items-center flex-1" style={{ gap: 34 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center no-underline relative"
                style={{
                  gap: 9,
                  fontSize: 14.5,
                  color: isActive ? "white" : inactiveColor,
                  fontWeight: isActive ? 500 : 400,
                  padding: "8px 0",
                }}
              >
                <Icon size={18} color={isActive ? activeColor : inactiveColor} />
                {item.label}
                {item.href === "/admin/medical-history" && newConsultRequests > 0 && (
                  <span
                    style={{
                      fontFamily: "ui-monospace, 'SFMono-Regular', 'Cascadia Code', Consolas, monospace",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 11.5,
                      color: isDark ? "#FF6B5E" : "#FFD9D4",
                      fontWeight: 600,
                    }}
                  >
                    {newConsultRequests}
                  </span>
                )}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -25,
                      height: 2,
                      background: underlineColor,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center flex-shrink-0" style={{ gap: 24 }}>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative flex-shrink-0"
            style={{
              width: 52,
              height: 28,
              borderRadius: 16,
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
              border: `1px solid ${barBorder}`,
            }}
          >
            <span
              className="flex items-center justify-center transition-all duration-200"
              style={{
                position: "absolute",
                top: 2,
                left: isDark ? 2 : 26,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: isDark ? "#3FD9AE" : "white",
                color: isDark ? "#0A0F0E" : "var(--teal-deep)",
              }}
            >
              {isDark ? <Moon size={13} /> : <Sun size={13} />}
            </span>
          </button>
          <span style={{ fontSize: 13, color: isDark ? "rgba(234,242,239,0.7)" : "rgba(255,255,255,0.7)" }}>
            {session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="transition-colors duration-200"
            style={{ fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase", color: inactiveColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = inactiveColor)}
          >
            Sign out →
          </button>
        </div>
      </header>

      {/* Mobile top bar */}
      <div
        className="xl:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{ background: barBg, height: 52, borderBottom: `1px solid ${barBorder}` }}
      >
        <Image
          src="/vitalstats_logo_horizontal.png"
          alt="VitalStats"
          width={2066}
          height={570}
          className="h-6 w-auto"
          style={{ filter: "brightness(0) invert(1) opacity(0.9)" }}
        />
        <div className="flex items-center" style={{ gap: 14 }}>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative flex-shrink-0"
            style={{
              width: 44,
              height: 24,
              borderRadius: 14,
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
              border: `1px solid ${barBorder}`,
            }}
          >
            <span
              className="flex items-center justify-center transition-all duration-200"
              style={{
                position: "absolute",
                top: 2,
                left: isDark ? 2 : 22,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: isDark ? "#3FD9AE" : "white",
                color: isDark ? "#0A0F0E" : "var(--teal-deep)",
              }}
            >
              {isDark ? <Moon size={11} /> : <Sun size={11} />}
            </span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-[10px] tracking-[0.06em] uppercase"
            style={{ color: inactiveColor }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Background matches the current page's own dark theme only on routes
          that support dark mode — otherwise other admin pages, which are
          light-only, would get an unwanted dark strip behind their content. */}
      <main
        className="flex-1 overflow-auto pt-[52px] pb-16 xl:pt-0 xl:pb-0"
        style={{
          background:
            isDark && (pathname === "/admin" || pathname === "/admin/medical-history")
              ? "#0A0F0E"
              : "var(--cream)",
        }}
      >
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          background: isDark ? "#0B1210" : "#ffffff",
          borderTop: `1px solid ${isDark ? "rgba(63,217,174,0.12)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.75 py-2 no-underline"
              style={{ color: isActive ? (isDark ? "#3FD9AE" : "var(--teal)") : isDark ? "rgba(234,242,239,0.4)" : "var(--ink-faint)" }}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[9px]" style={{ fontWeight: isActive ? 600 : 400 }}>
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
