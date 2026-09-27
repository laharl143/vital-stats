import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaymentDoneView from "@/components/checkout/PaymentDoneView";

export const metadata: Metadata = {
  title: "Payment | VitalStats Philippines",
  description: "Checking your online payment.",
  robots: { index: false },
};

// Where PayMongo sends the customer back after paying (VS-255, spec 0004, AC-16).
export default function PaymentDonePage() {
  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 px-6 md:px-16 pt-36 md:pt-44 pb-24" style={{ background: "var(--cream)" }}>
          <div className="mx-auto" style={{ maxWidth: 1120 }}>
            <PaymentDoneView />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
