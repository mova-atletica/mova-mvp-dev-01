-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "referenceVideoUrl" TEXT NOT NULL,
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
    "relatedExercises" TEXT NOT NULL
);
