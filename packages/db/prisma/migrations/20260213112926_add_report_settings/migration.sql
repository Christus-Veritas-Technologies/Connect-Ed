-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "reportSchoolLogo" TEXT,
ADD COLUMN     "reportSchoolMotto" TEXT,
ADD COLUMN     "reportShowExamDetails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowGrades" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowInsights" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowOverallAverage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowPassRates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowSchoolBranding" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowTeacherDetails" BOOLEAN NOT NULL DEFAULT true;
