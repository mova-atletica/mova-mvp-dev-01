-- AlterTable
ALTER TABLE "PatternAnalysis" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "PatternAnalysis" ADD COLUMN "primaryJoints" TEXT;
ALTER TABLE "PatternAnalysis" ADD COLUMN "toleranceMultipliers" TEXT;

-- AlterTable
ALTER TABLE "RepAnalysis" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "RepAnalysis" ADD COLUMN "goldStandardRep" TEXT;
ALTER TABLE "RepAnalysis" ADD COLUMN "keyFrames" TEXT;
ALTER TABLE "RepAnalysis" ADD COLUMN "primaryJoints" TEXT;
ALTER TABLE "RepAnalysis" ADD COLUMN "repBoundaries" TEXT;

-- CreateTable
CREATE TABLE "ExerciseRules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "thresholds" TEXT NOT NULL,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExerciseRules_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseRules_exerciseId_key" ON "ExerciseRules"("exerciseId");
