-- AlterEnum
ALTER TYPE "ChatMessageType" ADD VALUE 'FILE';

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER;
