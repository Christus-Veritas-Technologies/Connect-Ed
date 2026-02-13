/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,name,level]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subjects_schoolId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_name_level_key" ON "subjects"("schoolId", "name", "level");
