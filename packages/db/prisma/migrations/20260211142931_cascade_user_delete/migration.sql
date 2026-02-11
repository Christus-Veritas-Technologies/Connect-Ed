-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "fee_payments" DROP CONSTRAINT "fee_payments_receivedById_fkey";

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
