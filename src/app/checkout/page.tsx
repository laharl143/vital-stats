import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CheckoutView from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout | VitalStats Philippines",
  description: "Enter your delivery details and place your order.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 px-6 md:px-16 pt-36 md:pt-44 pb-24" style={{ background: "var(--cream)" }}>
          <div className="mx-auto" style={{ maxWidth: 1120 }}>
            <CheckoutView />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
