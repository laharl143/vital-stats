import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrderStatusView from "@/components/orders/OrderStatusView";
import { expirePayments } from "@/lib/paid-order";
import { isStatusToken } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Your order | VitalStats Philippines",
  description: "Where your VitalStats order is.",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // the token never leaves in a Referer header
};

export const maxDuration = 30; // room for the PayMongo check before an unpaid order expires (spec 0004)

// The private order status page (VS-256, spec 0005). The secret token in the link is the only key:
// no login. Read fresh on every request, and read only apart from the lazy expiry check.
const load = (statusToken: string) =>
  prisma.order.findUnique({
    where: { statusToken },
    select: {
      orderNumber: true, createdAt: true, status: true, checkoutKey: true, customerName: true, customerAddress: true,
      paymentStatus: true, paymentChannel: true, paidAmount: true, totalAmount: true, shippingFee: true,
      items: { select: { id: true, productName: true, quantity: true, unitPrice: true }, orderBy: { id: "asc" } },
    },
  });

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  if (!isStatusToken(token)) notFound();

  let order = await load(token);
  if (!order) notFound();
  // An abandoned payment shows as expired, asking PayMongo first like the status endpoint (AC-4).
  if (order.status === "AWAITING_PAYMENT" && order.checkoutKey) {
    await expirePayments({ checkoutKey: order.checkoutKey });
    order = (await load(token)) ?? order;
  }

  const isNew = (await searchParams).new === "1";

  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 px-6 md:px-16 pt-36 md:pt-44 pb-24" style={{ background: "var(--cream)" }}>
          <div className="mx-auto" style={{ maxWidth: 760 }}>
            <OrderStatusView order={order} isNew={isNew} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
