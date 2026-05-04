import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/react";
import { Cormorant_Garamond, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jakarta",
  display: "swap",
});

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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${jakarta.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}