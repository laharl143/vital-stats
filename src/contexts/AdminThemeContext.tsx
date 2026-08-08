"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AdminTheme = "dark" | "light";

interface AdminThemeContextValue {
  theme: AdminTheme;
  toggleTheme: () => void;
  setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const STORAGE_KEY = "vitalstats-admin-theme";

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("light");

  // Reads the persisted preference from localStorage post-mount rather than
  // as a lazy initial state, so server and first client render agree (no
  // hydration mismatch) — the one-frame flash to the stored theme is the
  // accepted tradeoff for that.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  const setTheme = (next: AdminTheme) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}
