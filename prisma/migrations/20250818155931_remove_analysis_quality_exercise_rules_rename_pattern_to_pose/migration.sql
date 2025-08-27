/*
  Warnings:

  - You are about to drop the `AnalysisQuality` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExerciseRules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PatternAnalysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `repCountingRules` on the `RepAnalysis` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AnalysisQuality_exerciseId_key";

-- DropIndex
DROP INDEX "ExerciseRules_exerciseId_key";

-- DropIndex
DROP INDEX "PatternAnalysis_exerciseId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnalysisQuality";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExerciseRules";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PatternAnalysis";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PoseAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "targetPoses" TEXT NOT NULL,
    "angleRanges" TEXT NOT NULL,
    "primaryJoints" TEXT,
    "toleranceMultipliers" TEXT,
    "feedbackMessages" TEXT,
    "adminNotes" TEXT,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PoseAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "goldStandardRep" TEXT,
    "repBoundaries" TEXT,
    "adminNotes" TEXT,
    "jointAngleRules" TEXT,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RepAnalysis" ("adminNotes", "createdAt", "exerciseId", "goldStandardRep", "id", "jointAngleRules", "repBoundaries", "updatedAt", "validatedByAdmin") SELECT "adminNotes", "createdAt", "exerciseId", "goldStandardRep", "id", "jointAngleRules", "repBoundaries", "updatedAt", "validatedByAdmin" FROM "RepAnalysis";
DROP TABLE "RepAnalysis";
ALTER TABLE "new_RepAnalysis" RENAME TO "RepAnalysis";
CREATE UNIQUE INDEX "RepAnalysis_exerciseId_key" ON "RepAnalysis"("exerciseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PoseAnalysis_exerciseId_key" ON "PoseAnalysis"("exerciseId");
