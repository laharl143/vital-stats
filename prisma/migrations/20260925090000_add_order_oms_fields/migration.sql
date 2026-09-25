-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "omsCustomerId" TEXT,
ADD COLUMN     "omsOrderId" TEXT,
ADD COLUMN     "sentToOmsAt" TIMESTAMP(3);
