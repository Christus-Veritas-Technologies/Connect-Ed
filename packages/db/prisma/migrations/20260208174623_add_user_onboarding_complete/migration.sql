-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT true;
