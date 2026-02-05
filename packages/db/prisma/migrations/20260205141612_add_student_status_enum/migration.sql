-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ABSENT');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';
