/*
  Warnings:

  - A unique constraint covering the columns `[schoolId]` on the table `plan_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "plan_payments_schoolId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "plan_payments_schoolId_key" ON "plan_payments"("schoolId");
