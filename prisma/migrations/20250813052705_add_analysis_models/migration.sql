-- CreateTable
CREATE TABLE "RepAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "averageRepDuration" REAL NOT NULL,
    "expectedRepCount" INTEGER NOT NULL,
    "repDurationRange" TEXT NOT NULL,
    "phases" TEXT NOT NULL,
    "tempoPattern" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "referencePatterns" TEXT NOT NULL,
    "angleRanges" TEXT NOT NULL,
    "posePatterns" TEXT,
    "flowPatterns" TEXT,
    "patternQuality" REAL NOT NULL,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatternAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisQuality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "classificationQuality" REAL NOT NULL,
    "repAnalysisQuality" REAL NOT NULL,
    "patternQuality" REAL NOT NULL,
    "overallQuality" REAL NOT NULL,
    "issues" TEXT NOT NULL,
    "reviewedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisQuality_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RepAnalysis_exerciseId_key" ON "RepAnalysis"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "PatternAnalysis_exerciseId_key" ON "PatternAnalysis"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisQuality_exerciseId_key" ON "AnalysisQuality"("exerciseId");
