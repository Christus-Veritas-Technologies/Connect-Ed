-- CreateTable
CREATE TABLE "plan_payments" (
    "id" TEXT NOT NULL,
    "onceOffPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "plan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermediate_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "plan" "Plan" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "intermediate_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_payments_schoolId_idx" ON "plan_payments"("schoolId");

-- CreateIndex
CREATE INDEX "intermediate_payments_userId_idx" ON "intermediate_payments"("userId");

-- CreateIndex
CREATE INDEX "intermediate_payments_schoolId_idx" ON "intermediate_payments"("schoolId");

-- CreateIndex
CREATE INDEX "intermediate_payments_paid_idx" ON "intermediate_payments"("paid");

-- AddForeignKey
ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermediate_payments" ADD CONSTRAINT "intermediate_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermediate_payments" ADD CONSTRAINT "intermediate_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
