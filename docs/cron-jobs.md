# Cron Jobs — GameDayWire

All 9 scheduled tasks powered by node-cron, their schedules, purposes, exit codes, and dry-run testing.

---

## Overview

The system uses **node-cron** for scheduled task execution. Each cron job is defined in its own file under `cron/`. Jobs are managed by the Node.js runtime and can be executed as CLI commands for testing.

---

## Schedule Summary

| Job              | Schedule (UTC)      | File                       | Purpose                              |
| ---------------- | ------------------- | -------------------------- | ------------------------------------ |
| morningArticle   | Daily 08:00         | `cron/morningArticle.ts`   | Generate and publish morning article |
| eveningArticle   | Daily 19:00         | `cron/eveningArticle.ts`   | Generate and publish evening article |
| trendMonitor     | Every 3 hours       | `cron/trendMonitor.ts`     | Discover and score trending topics   |
| keywordRefresh   | Daily 02:00         | `cron/keywordRefresh.ts`   | Regenerate keyword matrix            |
| contentRefresh   | Daily 03:00         | `cron/contentRefresh.ts`   | Identify stale articles for update   |
| sitemapGenerator | Daily 01:00         | `cron/sitemapGenerator.ts` | Rebuild XML sitemap                  |
| linkUpdate       | Weekly Sunday 04:00 | `cron/linkUpdate.ts`       | Rebuild internal link graph          |
| seoAudit         | Weekly Sunday 05:00 | `cron/seoAudit.ts`         | Technical SEO health check           |
| backup           | Weekly Sunday 06:00 | `cron/backup.ts`           | Database and file backup             |

---

## Job Details

### morningArticle

**Schedule:** Daily at 08:00 UTC
**File:** `cron/morningArticle.ts`
**Exit Codes:** 0=success, 1=retry, 2=manual review

Generates one article. Category alternates daily (sports/entertainment) or picks the highest-scoring trend.

**Execution Flow:**

1. Fetch top trend from `TrendFinder.discover()`
2. Get winning keyword from `KeywordMatrix.getWinningKeyword()`
3. Generate `ContentGuide` from SerpAPI data
4. Generate article via `GroqWriter.generateArticle()`
5. Optimize via `SEOOptimizer` (title, meta, schema, headings)
6. Insert links via `LinkManager`
7. Publish via `Publisher.publish()`
8. Log success/failure to `system_logs`

### eveningArticle

**Schedule:** Daily at 19:00 UTC
**File:** `cron/eveningArticle.ts`
**Exit Codes:** 0=success, 1=retry, 2=manual review

Same as `morningArticle` but uses the opposite category to ensure one sports and one entertainment article per day.

### trendMonitor

**Schedule:** Every 3 hours (`0 */3 * * *`)
**File:** `cron/trendMonitor.ts`
**Exit Codes:** 0=success, 1=API error

Fetches trending searches from SerpAPI for all target geos (US, GB, CA, AU, IE, NZ, ZA, IN), filters, scores, and stores new trends in the `trends` table. Also updates `related_searches`.

**Execution Flow:**

1. Call SerpAPI `trending_searches` for each target geo
2. Filter for sports and entertainment categories
3. Calculate trend scores using the composite algorithm
4. Store new trends (ignore duplicates by normalized_query)
5. Update related searches for existing trends
6. Prune trends older than 7 days

### keywordRefresh

**Schedule:** Daily at 02:00 UTC
**File:** `cron/keywordRefresh.ts`
**Exit Codes:** 0=success

Expands the keyword matrix by:

1. Taking top head terms from recent trends
2. Generating new modifier combinations
3. Validating with SerpAPI batch endpoint
4. Updating scores and statuses
5. Pruning stale entries

### contentRefresh

**Schedule:** Daily at 03:00 UTC
**File:** `cron/contentRefresh.ts`
**Exit Codes:** 0=success

Identifies articles that need refreshing based on:

- Age (30 days since last update)
- Position drop (>5 spots in SERP)
- Trend resurgence (SerpAPI volume increase >20%)

For each stale article:

1. Generate new ContentGuide with updated SerpAPI data
2. Rewrite affected sections (preserve URL and structure)
3. Update `dateModified` schema
4. Re-ping Google Indexing API

### sitemapGenerator

**Schedule:** Daily at 01:00 UTC
**File:** `cron/sitemapGenerator.ts`
**Exit Codes:** 0=success

Regenerates all sitemap files:

1. Generate the sitemap index
2. Generate paginated article sitemaps
3. Generate static page sitemap
4. Ping search engines (Google, Bing)
5. Clear stale sitemap cache

### linkUpdate

**Schedule:** Weekly on Sunday at 04:00 UTC
**File:** `cron/linkUpdate.ts`
**Exit Codes:** 0=success

Rebuilds the internal link graph:

1. Scan all articles for keyword matches
2. Update `link_graph` table
3. Insert new internal links where missing
4. Remove obsolete links
5. Log changes

### seoAudit

**Schedule:** Weekly on Sunday at 05:00 UTC
**File:** `cron/seoAudit.ts`
**Exit Codes:** 0=success, 1=issues found

Performs technical SEO checks:

1. Check for broken links (internal/external)
2. Validate schema markup for all articles
3. Ensure meta descriptions are within length
4. Check for duplicate titles
5. Verify sitemap integrity
6. Report issues via `system_logs`

### backup

**Schedule:** Weekly on Sunday at 06:00 UTC
**File:** `cron/backup.ts`
**Exit Codes:** 0=success, 1=backup failed

Performs system backup:

1. Dump PostgreSQL database via pg_dump
2. Archive article assets and featured images
3. Compress logs and cache metadata
4. Store backup in backup directory
5. Rotate backups older than 30 days
6. Notify admin on failure

---

## Dry-Run Testing

All cron jobs support a dry-run mode that prevents side effects while executing all other logic normally.

### Running a Dry Run

```bash
# Using Node.js directly
node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true }).then(console.log).catch(console.error);
"

# Or using the pnpm script
pnpm cron:dry-run trendMonitor

# Available dry-run commands
pnpm cron:dry-run morningArticle
pnpm cron:dry-run eveningArticle
pnpm cron:dry-run trendMonitor
pnpm cron:dry-run keywordRefresh
pnpm cron:dry-run contentRefresh
pnpm cron:dry-run sitemapGenerator
pnpm cron:dry-run linkUpdate
pnpm cron:dry-run seoAudit
pnpm cron:dry-run backup
```

### What Dry-Run Disables

A dry run executes all logic (data fetching, scoring, analysis, logging) but **skips**:

- Database writes (INSERT/UPDATE)
- External API calls with side effects (Google Indexing API pings)
- Cache file writes
- Published content changes

---

## Production Deployment

### Systemd Timer (Linux Server)

For production, configure systemd timers or a cron entry:

```bash
# Edit crontab
crontab -e

# Add entries (example for a Linux server where Node.js app is always running)
# These assume the app is managed by PM2 or similar process manager
# The cron jobs are internal to the running Node.js process
```

### Docker

When using Docker Compose, the cron jobs run inside the backend container via node-cron. No external cron daemon is required. The `docker-compose.yml` starts the backend Express server which registers all cron schedules on boot.

---

## Exit Code Reference

| Code | Meaning       | Action                                                               |
| ---- | ------------- | -------------------------------------------------------------------- |
| 0    | Success       | Job completed normally                                               |
| 1    | Retry         | Temporary failure (API timeout, rate limit) — retry on next schedule |
| 2    | Manual review | Quality gate failure or sensitive topic — pause for human inspection |
