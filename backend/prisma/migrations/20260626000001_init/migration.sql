-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "growthRate" DOUBLE PRECISION,
    "geo" TEXT,
    "relatedQueries" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "trendScore" DOUBLE PRECISION,
    "articleId" TEXT,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "headTerm" TEXT NOT NULL,
    "modifier" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "difficulty" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "intent" TEXT,
    "categoryId" TEXT NOT NULL,
    "priorityScore" DOUBLE PRECISION,
    "serpFeatures" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3),
    "timesTargeted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT,
    "h1" TEXT,
    "contentHtml" TEXT,
    "contentBlocks" TEXT,
    "keywordId" TEXT NOT NULL,
    "trendId" TEXT,
    "wordCount" INTEGER,
    "readingLevel" DOUBLE PRECISION,
    "schemaMarkup" TEXT,
    "internalLinks" TEXT,
    "externalLinks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generationAttempts" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3),
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" DOUBLE PRECISION,
    "bounceRate" DOUBLE PRECISION,
    "googlePosition" INTEGER,
    "imageUrl" TEXT,
    "excerpt" TEXT,
    "author" TEXT NOT NULL DEFAULT 'GameDayWire Staff',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "articleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("articleId","categoryId")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" DOUBLE PRECISION,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMetric" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "googlePosition" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "avgPosition" DOUBLE PRECISION,
    "topQueries" TEXT,
    "trackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkGraph" (
    "id" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "anchorText" TEXT,
    "linkType" TEXT NOT NULL,
    "contextSnippet" TEXT,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGuide" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "guideData" TEXT,
    "serpData" TEXT,
    "narrativeAngle" TEXT,
    "dataPointsCount" INTEGER,
    "contentGaps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "logType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- AddForeignKey
ALTER TABLE "Trend" ADD CONSTRAINT "Trend_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMetric" ADD CONSTRAINT "SeoMetric_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkGraph" ADD CONSTRAINT "LinkGraph_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGuide" ADD CONSTRAINT "ContentGuide_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGuide" ADD CONSTRAINT "ContentGuide_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
