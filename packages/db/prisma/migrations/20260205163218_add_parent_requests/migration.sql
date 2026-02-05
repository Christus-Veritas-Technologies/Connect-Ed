-- CreateEnum
CREATE TYPE "ParentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "parent_requests" (
    "id" TEXT NOT NULL,
    "status" "ParentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "requestingParentId" TEXT NOT NULL,
    "existingParentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "parent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_requests_requestingParentId_idx" ON "parent_requests"("requestingParentId");

-- CreateIndex
CREATE INDEX "parent_requests_existingParentId_idx" ON "parent_requests"("existingParentId");

-- CreateIndex
CREATE INDEX "parent_requests_studentId_idx" ON "parent_requests"("studentId");

-- CreateIndex
CREATE INDEX "parent_requests_schoolId_idx" ON "parent_requests"("schoolId");

-- CreateIndex
CREATE INDEX "parent_requests_status_idx" ON "parent_requests"("status");

-- AddForeignKey
ALTER TABLE "parent_requests" ADD CONSTRAINT "parent_requests_requestingParentId_fkey" FOREIGN KEY ("requestingParentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_requests" ADD CONSTRAINT "parent_requests_existingParentId_fkey" FOREIGN KEY ("existingParentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_requests" ADD CONSTRAINT "parent_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_requests" ADD CONSTRAINT "parent_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
