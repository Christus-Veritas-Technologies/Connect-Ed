-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "billingCycleEnd" TIMESTAMP(3),
ADD COLUMN     "foundingSchool" BOOLEAN NOT NULL DEFAULT false;
