import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartView from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Your cart | VitalStats Philippines",
  description: "Review the products in your cart before checkout.",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 px-6 md:px-16 pt-36 md:pt-44 pb-24" style={{ background: "var(--cream)" }}>
          <div className="mx-auto" style={{ maxWidth: 1120 }}>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: "var(--teal)" }}>
              Cart
            </p>
            <h1 className="font-display text-[36px] md:text-[44px] font-light mb-10" style={{ color: "var(--ink)" }}>
              Your cart
            </h1>
            <CartView />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
