-- CreateTable
CREATE TABLE "ReferencePatternAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "patterns" TEXT NOT NULL,
    "repPhases" TEXT NOT NULL,
    "angleRanges" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReferencePatternAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "referencePatterns" TEXT,
    "exerciseType" TEXT NOT NULL DEFAULT 'repetition',
    "averageRepDuration" REAL,
    "expectedRepCount" INTEGER
);
INSERT INTO "new_Exercise" ("authorName", "authorProfileUrl", "createdBy", "dateAdded", "description", "equipment", "id", "image", "instructions", "jointsOfInterest", "level", "muscleGroups", "referenceKeypointsUrl", "referenceVideoUrl", "relatedExercises", "tags", "title") SELECT "authorName", "authorProfileUrl", "createdBy", "dateAdded", "description", "equipment", "id", "image", "instructions", "jointsOfInterest", "level", "muscleGroups", "referenceKeypointsUrl", "referenceVideoUrl", "relatedExercises", "tags", "title" FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReferencePatternAnalysis_exerciseId_key" ON "ReferencePatternAnalysis"("exerciseId");
