"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "⬡" },
  { label: "Inquiries", href: "/admin/inquiries", icon: "✉" },
  { label: "Orders", href: "/admin/orders", icon: "📦" },
  { label: "Products", href: "/admin/products", icon: "◈" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Show just children for login page — no sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col"
        style={{ background: "var(--teal-deep)", minHeight: "100vh" }}
      >
        <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Image
            src="/logo.png"
            alt="VitalStats"
            width={120}
            height={40}
            className="h-8 w-auto"
            style={{ filter: "brightness(0) invert(1) opacity(0.85)" }}
          />
          <div className="text-[9px] tracking-[0.14em] uppercase mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            Admin Portal
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-[6px] text-[13px] transition-all duration-200 no-underline"
                style={{
                  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.55)",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <span className="text-[16px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="text-[12px] mb-1 truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-[11px] tracking-[0.06em] uppercase transition-colors duration-200"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            Sign out →
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}