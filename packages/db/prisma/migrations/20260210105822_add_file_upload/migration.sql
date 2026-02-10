-- CreateEnum
CREATE TYPE "SharedFileRecipientType" AS ENUM ('USER', 'STUDENT', 'PARENT', 'ROLE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SHARED_FILE';

-- CreateTable
CREATE TABLE "shared_files" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedByStudentId" TEXT,
    "uploadedByParentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_file_recipients" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "recipientType" "SharedFileRecipientType" NOT NULL,
    "recipientUserId" TEXT,
    "recipientStudentId" TEXT,
    "recipientParentId" TEXT,
    "recipientRole" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_file_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_files_storedName_key" ON "shared_files"("storedName");

-- CreateIndex
CREATE INDEX "shared_files_schoolId_idx" ON "shared_files"("schoolId");

-- CreateIndex
CREATE INDEX "shared_files_uploadedByUserId_idx" ON "shared_files"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "shared_files_uploadedByStudentId_idx" ON "shared_files"("uploadedByStudentId");

-- CreateIndex
CREATE INDEX "shared_files_uploadedByParentId_idx" ON "shared_files"("uploadedByParentId");

-- CreateIndex
CREATE INDEX "shared_files_createdAt_idx" ON "shared_files"("createdAt");

-- CreateIndex
CREATE INDEX "shared_file_recipients_fileId_idx" ON "shared_file_recipients"("fileId");

-- CreateIndex
CREATE INDEX "shared_file_recipients_recipientUserId_idx" ON "shared_file_recipients"("recipientUserId");

-- CreateIndex
CREATE INDEX "shared_file_recipients_recipientStudentId_idx" ON "shared_file_recipients"("recipientStudentId");

-- CreateIndex
CREATE INDEX "shared_file_recipients_recipientParentId_idx" ON "shared_file_recipients"("recipientParentId");

-- CreateIndex
CREATE INDEX "shared_file_recipients_recipientRole_idx" ON "shared_file_recipients"("recipientRole");

-- CreateIndex
CREATE UNIQUE INDEX "shared_file_recipients_fileId_recipientUserId_key" ON "shared_file_recipients"("fileId", "recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_file_recipients_fileId_recipientStudentId_key" ON "shared_file_recipients"("fileId", "recipientStudentId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_file_recipients_fileId_recipientParentId_key" ON "shared_file_recipients"("fileId", "recipientParentId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_file_recipients_fileId_recipientRole_key" ON "shared_file_recipients"("fileId", "recipientRole");

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_uploadedByStudentId_fkey" FOREIGN KEY ("uploadedByStudentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_uploadedByParentId_fkey" FOREIGN KEY ("uploadedByParentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_file_recipients" ADD CONSTRAINT "shared_file_recipients_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "shared_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_file_recipients" ADD CONSTRAINT "shared_file_recipients_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_file_recipients" ADD CONSTRAINT "shared_file_recipients_recipientStudentId_fkey" FOREIGN KEY ("recipientStudentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_file_recipients" ADD CONSTRAINT "shared_file_recipients_recipientParentId_fkey" FOREIGN KEY ("recipientParentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
