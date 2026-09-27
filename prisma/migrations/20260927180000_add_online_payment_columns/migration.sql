-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUND_NEEDED', 'REFUNDED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "omsSendError" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(10,2),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentChannel" TEXT,
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus",
ADD COLUMN     "paymongoCheckoutId" TEXT,
ADD COLUMN     "paymongoCheckoutUrl" TEXT,
ADD COLUMN     "paymongoPaymentId" TEXT,
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymongoCheckoutId_key" ON "Order"("paymongoCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymongoPaymentId_key" ON "Order"("paymongoPaymentId");

-- CreateIndex
CREATE INDEX "Order_status_paymentExpiresAt_idx" ON "Order"("status", "paymentExpiresAt");

