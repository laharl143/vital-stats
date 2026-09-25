-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "omsLastEventAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OmsWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "handledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OmsWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OmsWebhookEvent_eventId_key" ON "OmsWebhookEvent"("eventId");
