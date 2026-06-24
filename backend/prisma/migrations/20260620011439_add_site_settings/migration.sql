-- Create SiteSetting table
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- Add articleId column to Trend table (if not already present)
ALTER TABLE "Trend" ADD COLUMN "articleId" TEXT;
