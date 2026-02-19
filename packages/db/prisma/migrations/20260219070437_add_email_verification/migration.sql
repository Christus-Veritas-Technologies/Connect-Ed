-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationCode" TEXT,
ADD COLUMN     "emailVerificationExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
