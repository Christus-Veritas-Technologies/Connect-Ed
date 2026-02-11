-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'ZAR', 'ZIG');

-- AlterTable
ALTER TABLE "onboarding_progress" ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';
