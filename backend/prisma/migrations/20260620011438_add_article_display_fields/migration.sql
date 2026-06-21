-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "searchVolume" INTEGER,
    "growthRate" REAL,
    "geo" TEXT,
    "relatedQueries" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "trendScore" REAL,
    CONSTRAINT "Trend_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword" TEXT NOT NULL,
    "headTerm" TEXT NOT NULL,
    "modifier" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "difficulty" REAL,
    "cpc" REAL,
    "intent" TEXT,
    "categoryId" INTEGER NOT NULL,
    "priorityScore" REAL,
    "serpFeatures" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" DATETIME,
    "timesTargeted" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Keyword_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT,
    "h1" TEXT,
    "contentHtml" TEXT,
    "contentBlocks" TEXT,
    "keywordId" INTEGER NOT NULL,
    "trendId" INTEGER,
    "wordCount" INTEGER,
    "readingLevel" REAL,
    "schemaMarkup" TEXT,
    "internalLinks" TEXT,
    "externalLinks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generationAttempts" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" REAL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastRefreshedAt" DATETIME,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" REAL,
    "bounceRate" REAL,
    "googlePosition" INTEGER,
    "imageUrl" TEXT,
    "excerpt" TEXT,
    "author" TEXT NOT NULL DEFAULT 'GameDayWire Staff',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    CONSTRAINT "Article_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Article_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "articleId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    PRIMARY KEY ("articleId", "categoryId"),
    CONSTRAINT "ArticleCategory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" REAL,
    CONSTRAINT "PageView_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeoMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "googlePosition" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" REAL,
    "avgPosition" REAL,
    "topQueries" TEXT,
    "trackedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeoMetric_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinkGraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceSlug" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "anchorText" TEXT,
    "linkType" TEXT NOT NULL,
    "contextSnippet" TEXT,
    "articleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LinkGraph_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentGuide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "keywordId" INTEGER NOT NULL,
    "guideData" TEXT,
    "serpData" TEXT,
    "narrativeAngle" TEXT,
    "dataPointsCount" INTEGER,
    "contentGaps" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentGuide_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContentGuide_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "logType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Trend_categoryId_idx" ON "Trend"("categoryId");

-- CreateIndex
CREATE INDEX "Trend_normalizedQuery_idx" ON "Trend"("normalizedQuery");

-- CreateIndex
CREATE INDEX "Trend_processed_idx" ON "Trend"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_keyword_key" ON "Keyword"("keyword");

-- CreateIndex
CREATE INDEX "Keyword_categoryId_idx" ON "Keyword"("categoryId");

-- CreateIndex
CREATE INDEX "Keyword_status_idx" ON "Keyword"("status");

-- CreateIndex
CREATE INDEX "Keyword_headTerm_idx" ON "Keyword"("headTerm");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_trendId_key" ON "Article"("trendId");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_keywordId_idx" ON "Article"("keywordId");

-- CreateIndex
CREATE INDEX "ArticleCategory_categoryId_idx" ON "ArticleCategory"("categoryId");

-- CreateIndex
CREATE INDEX "PageView_articleId_idx" ON "PageView"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_articleId_date_key" ON "PageView"("articleId", "date");

-- CreateIndex
CREATE INDEX "SeoMetric_articleId_idx" ON "SeoMetric"("articleId");

-- CreateIndex
CREATE INDEX "LinkGraph_articleId_idx" ON "LinkGraph"("articleId");

-- CreateIndex
CREATE INDEX "LinkGraph_sourceSlug_idx" ON "LinkGraph"("sourceSlug");

-- CreateIndex
CREATE INDEX "LinkGraph_targetSlug_idx" ON "LinkGraph"("targetSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentGuide_articleId_key" ON "ContentGuide"("articleId");

-- CreateIndex
CREATE INDEX "ContentGuide_keywordId_idx" ON "ContentGuide"("keywordId");

-- CreateIndex
CREATE INDEX "SystemLog_logType_idx" ON "SystemLog"("logType");

-- CreateIndex
CREATE INDEX "SystemLog_severity_idx" ON "SystemLog"("severity");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
