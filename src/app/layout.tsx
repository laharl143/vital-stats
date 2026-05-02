import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
