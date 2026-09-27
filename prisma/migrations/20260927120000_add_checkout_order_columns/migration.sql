-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ADMIN', 'STOREFRONT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'PREPAID');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutKey" TEXT,
ADD COLUMN     "consentedAt" TIMESTAMP(3),
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "privacyVersion" TEXT,
ADD COLUMN     "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "stockUnchecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsVersion" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

-- CreateIndex
CREATE INDEX "Order_ipAddress_createdAt_idx" ON "Order"("ipAddress", "createdAt");

