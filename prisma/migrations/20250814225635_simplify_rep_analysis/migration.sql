/*
  Warnings:

  - You are about to drop the column `averageRepDuration` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `expectedRepCount` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `keyFrames` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `phases` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `primaryJoints` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `repDurationRange` on the `RepAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `tempoPattern` on the `RepAnalysis` table. All the data in the column will be lost.

*/
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
    "repCountingRules" TEXT,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RepAnalysis" ("adminNotes", "createdAt", "exerciseId", "goldStandardRep", "id", "repBoundaries", "updatedAt", "validatedByAdmin") SELECT "adminNotes", "createdAt", "exerciseId", "goldStandardRep", "id", "repBoundaries", "updatedAt", "validatedByAdmin" FROM "RepAnalysis";
DROP TABLE "RepAnalysis";
ALTER TABLE "new_RepAnalysis" RENAME TO "RepAnalysis";
CREATE UNIQUE INDEX "RepAnalysis_exerciseId_key" ON "RepAnalysis"("exerciseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
