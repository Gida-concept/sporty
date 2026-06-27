-- Create serp_api_quotas table for persistent quota tracking
CREATE TABLE "serp_api_quotas" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serp_api_quotas_pkey" PRIMARY KEY ("id")
);

-- Create unique index on date (one row per day)
CREATE UNIQUE INDEX "serp_api_quotas_date_key" ON "serp_api_quotas"("date");
CREATE INDEX "serp_api_quotas_date_idx" ON "serp_api_quotas"("date");
