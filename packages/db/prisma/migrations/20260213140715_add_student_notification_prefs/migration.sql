-- AlterTable
ALTER TABLE "students" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyInApp" BOOLEAN NOT NULL DEFAULT true;
