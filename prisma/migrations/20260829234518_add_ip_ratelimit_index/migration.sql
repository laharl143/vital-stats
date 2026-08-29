-- CreateIndex
CREATE INDEX "Inquiry_ipAddress_createdAt_idx" ON "Inquiry"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalHistory_ipAddress_createdAt_idx" ON "MedicalHistory"("ipAddress", "createdAt");
