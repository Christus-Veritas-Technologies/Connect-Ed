-- CreateEnum
CREATE TYPE "SchoolPeriodType" AS ENUM ('TERM', 'HOLIDAY');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "currentPeriodType" "SchoolPeriodType" NOT NULL DEFAULT 'TERM',
ADD COLUMN     "currentTermNumber" INTEGER,
ADD COLUMN     "currentTermYear" INTEGER,
ADD COLUMN     "holidayStartDate" TIMESTAMP(3),
ADD COLUMN     "termStartDate" TIMESTAMP(3),
ADD COLUMN     "termlyFee" DECIMAL(10,2);
