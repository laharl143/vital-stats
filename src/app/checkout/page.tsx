import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CheckoutView from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout | VitalStats Philippines",
  description: "Enter your delivery details and place your order.",
  robots: { index: false },
};

// Card or e wallet needs PayMongo, the OMS (to price exactly what PayMongo charges) and the site URL
// (for PayMongo's return links). Read on the server; only the boolean reaches the browser (AC-1).
const onlineEnabled = () =>
  Boolean(process.env.PAYMONGO_SECRET_KEY && process.env.OMS_BASE_URL && process.env.OMS_API_KEY && process.env.NEXTAUTH_URL);

export default function CheckoutPage() {
  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 px-6 md:px-16 pt-36 md:pt-44 pb-24" style={{ background: "var(--cream)" }}>
          <div className="mx-auto" style={{ maxWidth: 1120 }}>
            <CheckoutView onlineEnabled={onlineEnabled()} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
