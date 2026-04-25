import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalStats — Precision Wellness for Body & Skin",
  description:
    "Medical-grade weight management, recovery, anti-aging, and skincare products. Clinically guided. Philippine FDA-Approved.",
  keywords: [
    "Tirzepatide Philippines",
    "NAD+ therapy Philippines",
    "GHK-Cu peptide",
    "Luméla skincare",
    "weight loss injection Philippines",
    "medically supervised weight loss",
    "anti-aging treatment Philippines",
  ],
  openGraph: {
    title: "VitalStats — Precision Wellness for Body & Skin",
    description:
      "Medical-grade treatments and premium skincare, supervised by licensed professionals.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
