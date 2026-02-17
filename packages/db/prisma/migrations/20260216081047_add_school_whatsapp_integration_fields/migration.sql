-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhone" TEXT,
ADD COLUMN     "whatsappSessionId" TEXT;
