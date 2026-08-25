import type { Metadata } from "next";
import Providers from "@/components/Providers";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Portal | VitalStats",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Providers>
  );
}
