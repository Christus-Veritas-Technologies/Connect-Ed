-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'EXAM_RESULT', 'GRADE', 'SUBJECT_INFO');

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberType" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAvatar" TEXT,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "targetStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_members_memberId_memberType_idx" ON "chat_members"("memberId", "memberType");

-- CreateIndex
CREATE INDEX "chat_members_classId_idx" ON "chat_members"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_classId_memberType_memberId_key" ON "chat_members"("classId", "memberType", "memberId");

-- CreateIndex
CREATE INDEX "chat_messages_classId_createdAt_idx" ON "chat_messages"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_targetStudentId_idx" ON "chat_messages"("targetStudentId");

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
