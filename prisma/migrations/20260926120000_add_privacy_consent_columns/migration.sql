-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "consentedAt" TIMESTAMP(3),
ADD COLUMN     "privacyVersion" TEXT;

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "consentedAt" TIMESTAMP(3),
ADD COLUMN     "privacyVersion" TEXT;
