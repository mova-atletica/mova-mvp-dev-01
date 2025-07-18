-- CreateTable
CREATE TABLE "FeaturedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL,
    "exerciseId" TEXT,
    "ctaText" TEXT NOT NULL DEFAULT 'Try Now',
    "ctaUrl" TEXT,
    "badgeText" TEXT NOT NULL DEFAULT 'Featured Exercise',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
