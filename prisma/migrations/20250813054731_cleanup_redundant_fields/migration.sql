/*
  Warnings:

  - You are about to drop the `ReferencePatternAnalysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `averageRepDuration` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `expectedRepCount` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `referencePatterns` on the `Exercise` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ReferencePatternAnalysis_exerciseId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReferencePatternAnalysis";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "referenceVideoUrl" TEXT,
    "referenceKeypointsUrl" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "muscleGroups" TEXT NOT NULL,
    "jointsOfInterest" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instructions" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorProfileUrl" TEXT,
    "relatedExercises" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL DEFAULT 'repetition',
    "exerciseSubtype" TEXT,
    "classificationConfidence" REAL
);
INSERT INTO "new_Exercise" ("authorName", "authorProfileUrl", "classificationConfidence", "createdBy", "dateAdded", "description", "equipment", "exerciseSubtype", "exerciseType", "id", "image", "instructions", "jointsOfInterest", "level", "muscleGroups", "referenceKeypointsUrl", "referenceVideoUrl", "relatedExercises", "tags", "title") SELECT "authorName", "authorProfileUrl", "classificationConfidence", "createdBy", "dateAdded", "description", "equipment", "exerciseSubtype", "exerciseType", "id", "image", "instructions", "jointsOfInterest", "level", "muscleGroups", "referenceKeypointsUrl", "referenceVideoUrl", "relatedExercises", "tags", "title" FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
