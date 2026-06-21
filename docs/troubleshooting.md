# Troubleshooting Guide — GameDayWire

A comprehensive guide to diagnosing and resolving common issues. Organized by the stage at which issues typically appear.

---

## Table of Contents

1. [Installation Issues](#1-installation-issues)
2. [Runtime Issues](#2-runtime-issues)
3. [Database Issues](#3-database-issues)
4. [Cache Issues](#4-cache-issues)
5. [Cron Job Issues](#5-cron-job-issues)
6. [API and Connectivity Issues](#6-api-and-connectivity-issues)
7. [Content Generation Issues](#7-content-generation-issues)
8. [SEO Issues](#8-seo-issues)
9. [General Debugging Tips](#9-general-debugging-tips)

---

## 1. Installation Issues

### 1.1 pnpm Install Fails

**Symptoms:**

- `pnpm install` returns errors about network, memory, or version conflicts.
- `node_modules/` is empty or incomplete.
- TypeScript errors about missing modules when running the app.

**Causes and Solutions:**

**Node.js Version Mismatch:**
The project requires Node.js 20 LTS or higher.

```bash
# Check your Node.js version
node -v

# If below 20.x, upgrade:
# macOS (Homebrew): brew upgrade node
# Ubuntu/Debian: Use NodeSource or nvm
# Windows: Download from https://nodejs.org/
```

**pnpm Version Mismatch:**

```bash
# Check pnpm version
pnpm -v

# Upgrade pnpm
corepack prepare pnpm@9 --activate
# Or: npm install -g pnpm@latest
```

**Network Timeouts:**
If downloads fail due to network issues:

```bash
# Retry with a longer timeout
pnpm install --fetch-timeout=120000

# Use a different registry
pnpm install --registry https://registry.npmmirror.com
```

**Corrupt Lockfile:**

```bash
# Delete lockfile and node_modules, then reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 1.2 Database Migration Fails

**Symptoms:**

- `npx prisma migrate dev` returns errors.
- Tables are not created in the SQLite file.
- Error messages about schema conflicts or missing database.

**Causes and Solutions:**

**Missing Prisma Client:**

```bash
# Regenerate Prisma client
npx prisma generate

# Verify the client was created
ls node_modules/.prisma/client/index.js
```

**Migration Conflict:**

```bash
# Reset the database (deletes all data — dev only)
npx prisma migrate reset

# Or create a fresh migration
npx prisma migrate dev --name init
```

**SQLite File Permissions:**

```bash
# Ensure the prisma directory is writable
ls -la backend/prisma/
chmod 755 backend/prisma/
touch backend/prisma/dev.db
chmod 644 backend/prisma/dev.db
```

### 1.3 404 on All Pages

**Symptoms:**

- Every URL returns a 404 error except the homepage.
- Article URLs like `/article/slug/` return 404.
- API endpoints return 404.

**Causes and Solutions:**

**Backend Not Running:**

```bash
# Check if the backend server is running
curl -s http://localhost:3001/api/health
# If connection refused, start the server:
pnpm --filter backend dev
```

**Frontend Not Running:**

```bash
# Check if the frontend server is running
curl -s http://localhost:3000
# If connection refused, start the server:
pnpm --filter frontend dev
```

**Wrong API URL in Frontend:**

```bash
# Check .env has the correct API URL
# .env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Nginx Routes Not Configured (Production):**

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log
```

---

## 2. Runtime Issues

### 2.1 No Articles Generated

**Symptoms:**

- After 24+ hours of cron running, no articles appear in the database.
- Article count remains at 0.
- Cron logs show "No suitable trend found" or "Keyword matrix empty."

**Causes and Solutions:**

**SerpAPI Key Invalid or Expired:**

```bash
# Test your SerpAPI key
curl -s "https://serpapi.com/search.json?q=test&api_key=YOUR_KEY" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log(j.search_metadata?.status || 'Error');
"
```

If this returns an error, regenerate your key from the SerpAPI dashboard. Free accounts have only 100 searches/month.

**SerpAPI Rate Limit Hit:**

- Check your SerpAPI dashboard for usage statistics.
- Symptoms: Logs show "SerpAPI rate limit reached" or error code E001.
- Solutions: Wait for plan reset, upgrade your plan, or reduce cache TTLs to reuse cached data.

**Trend Monitor Not Running:**
The `trendMonitor` cron must run before article generation, as it discovers and scores the trends.

```bash
# Run it manually in dry-run mode
node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true }).then(console.log).catch(console.error);
"
```

**No Trends Match Filters:**
The trend scoring algorithm may filter out all candidates if thresholds are too strict.

```bash
# Run trendMonitor with debug logging
DEBUG=trends* pnpm --filter backend node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true }).then(console.log);
"
```

Temporarily lower thresholds: set `MIN_SEARCH_VOLUME=100` in `.env`, restart, and re-run.

### 2.2 API Returns 500 Error

**Symptoms:**

- Any API endpoint returns HTTP 500.
- CURL tests show 500 status.
- Error is logged to the backend error log.

**Causes and Solutions:**

**Check the Application Log:**

```bash
tail -100 logs/backend/error.log
```

**Check Prisma Errors:**

```bash
# Enable Prisma query logging
DEBUG="prisma:*" pnpm --filter backend dev
```

**Common API 500 Causes:**

- **Missing `.env` configuration** — The endpoint tries to access a config value that is not set.
- **Database query failure** — Prisma cannot connect to the SQLite file.
- **Cache directory not writable** — The API response cannot be cached.
- **JSON parse error** — A SerpAPI or Groq response could not be parsed.

**Isolate the Failing Component:**

```bash
# Test database connectivity directly
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('Database OK'))
  .catch(e => console.error('Database FAILED:', e.message))
  .finally(() => prisma.\$disconnect());
"
```

---

## 3. Database Issues

### 3.1 SQLite Connection Failed

**Symptoms:**

- Health check shows `database: status: error`.
- All endpoints that read/write the database fail.

**Causes and Solutions:**

**Incorrect DATABASE_URL:**

```bash
# Check your .env
# Should be:
DATABASE_URL="file:./dev.db"
# The path is relative to backend/prisma/
```

**SQLite File Missing:**

```bash
# The database file should be at backend/prisma/dev.db
ls -la backend/prisma/dev.db

# If it doesn't exist, run migration:
npx prisma migrate dev
```

**File Permissions:**

```bash
# SQLite needs write permission to both the file and directory
chmod 755 backend/prisma/
chmod 644 backend/prisma/dev.db
```

**Database Corrupted:**

```bash
# Backup current database
cp backend/prisma/dev.db backend/prisma/dev.db.corrupt

# Reset and re-migrate (development only)
npx prisma migrate reset
```

### 3.2 Migration Fails on Foreign Key

**Symptoms:**

- Migration stops with a foreign key constraint error.
- Tables are partially created.

**Causes and Solutions:**

**Table Creation Order:**
Foreign key references must be created after the referenced table. The Prisma migration handles this automatically, but if you modify the schema manually:

1. trends (referenced by articles)
2. keywords (referenced by articles and content_guides)
3. articles (references trends and keywords)
4. seo_metrics (references articles)
5. link_graph, content_guides, system_logs

**Reset and Retry:**

```bash
npx prisma migrate reset
npx prisma migrate dev
```

### 3.3 Duplicate Key Violation

**Symptoms:**

- Article generation fails with "Unique constraint failed" error.
- Logs show "duplicate slug" or "duplicate keyword" errors.

**Causes and Solutions:**

**Article Slug Collision:**
Two differently titled articles may produce the same slug. The SEOOptimizer should append a short random string when a collision is detected.

```bash
# Check for duplicate slugs in the database
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const dupes = await prisma.\$queryRawUnsafe(
    'SELECT slug, COUNT(*) as count FROM articles GROUP BY slug HAVING count > 1'
  );
  console.log('Duplicate slugs:', dupes);
  await prisma.\$disconnect();
}
check();
"
```

**Keyword Uniqueness:**
The keywords table has a UNIQUE constraint on the keyword column.

```bash
# Check for duplicate keywords
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const dupes = await prisma.\$queryRawUnsafe(
    'SELECT keyword, COUNT(*) as count FROM keywords GROUP BY keyword HAVING count > 1'
  );
  console.log('Duplicate keywords:', dupes);
  await prisma.\$disconnect();
}
check();
"
```

---

## 4. Cache Issues

### 4.1 Cache Not Working

**Symptoms:**

- API responses always show `"cached": false`.
- Page load times are consistently slow.
- Cache directory remains empty.

**Causes and Solutions:**

**Directory Permissions:**

```bash
# Ensure cache directories are writable
chmod -R 755 cache/
```

**CACHE_ENABLED Set to False:**

```bash
# Check .env
CACHE_ENABLED=true
```

**Wrong Cache Path:**
Ensure the cache path is correct in your service configuration. Cron jobs may have a different working directory — always configure absolute paths in production.

### 4.2 Cache Not Invalidating

**Symptoms:**

- Updated articles still show old content.
- New articles do not appear on the homepage.
- Deleted articles are still accessible.

**Causes and Solutions:**

**Missing Cache Clear on Publish:**
The Publisher service must call cache invalidation after each publish or update:

- Invalidate article HTML cache
- Invalidate homepage cache
- Invalidate RSS feed cache

**Next.js ISR Not Revalidating:**

```bash
# Manually trigger revalidation
curl -X POST "http://localhost:3000/api/revalidate?secret=YOUR_SECRET"
```

**Cloudflare Cache Not Purging:**
If Cloudflare is caching your pages, application-level cache invalidation is not enough:

```bash
# Purge Cloudflare cache via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

---

## 5. Cron Job Issues

### 5.1 Cron Not Running

**Symptoms:**

- Log files in `logs/cron/` are empty or missing.
- Articles are not generated at scheduled times.
- Trends are not being discovered.

**Causes and Solutions:**

**node-cron Not Registered:**
Check that cron jobs are registered in the application startup:

```js
// backend/src/index.js — verify this exists
import { startCronJobs } from './cron';
startCronJobs();
```

**Node.js Process Not Running:**
The cron jobs run inside the Node.js process. If the process stops, cron stops.

```bash
# Check if the backend process is running
pm2 status
# If stopped:
pm2 start sporty-backend
```

**Log File Not Writable:**

```bash
# Check cron log directory
ls -la logs/cron/
chmod -R 755 logs/cron/
```

**Lock File Stuck (Docker):**
Some cron scripts create a lock file to prevent concurrent execution.

```bash
# Check for and remove lock files
ls -la /tmp/*.lock
rm -f /tmp/*.lock
```

### 5.2 Cron Runs but Shows Errors

**Symptoms:**

- Log files contain error messages.
- Articles are not being generated despite cron running.

**Causes and Solutions:**

**Node.js Memory Limit:**
Article generation can consume significant memory.

```bash
# Run with increased memory
node --max-old-space-size=512 node_modules/.bin/ts-node cron/morningArticle.ts
```

**Environment Variables:**
Cron jobs inherit the environment from the Node.js process. Ensure `.env` is loaded before cron runs:

```js
// In your cron initialization
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
```

**Script-Specific Exit Codes:**
Each cron script returns specific exit codes:

- **0:** Success
- **1:** Retry (transient failure, e.g., API timeout)
- **2:** Manual review (quality gate failure)

**Dry-Run Mode:**

```bash
node -e "
const { morningArticle } = require('./cron/morningArticle');
morningArticle({ dryRun: true, verbose: true }).then(console.log).catch(console.error);
"
```

---

## 6. API and Connectivity Issues

### 6.1 API Rate Limited

**Symptoms:**

- API endpoints return HTTP 429 with RATE_LIMIT error code.
- The `Retry-After` header indicates the wait time.

**Causes and Solutions:**

**Legitimate Traffic Exceeding Limits:**

```bash
# Check your rate limit config
curl -s http://localhost:3001/api/health | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log(JSON.stringify(j.checks, null, 2));
"
```

- Increase frontend polling intervals
- Implement client-side caching
- Adjust rate limit configuration in middleware

**Bot or Scraper Traffic:**

- Use Cloudflare's "Bot Fight Mode"
- Add IP-based blocking in Nginx:
  ```nginx
  location /api/ {
    deny 192.168.1.100;
    allow all;
  }
  ```

### 6.2 Webhook Not Receiving

**Symptoms:**

- Webhook endpoint returns 401 (invalid signature).
- External services cannot send webhook callbacks.

**Causes and Solutions:**

**HMAC Signature Mismatch:**

```bash
# Debug signature verification
node -e "
const crypto = require('crypto');
const secret = 'your-webhook-secret';
const body = JSON.stringify({event: 'test'});
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');
console.log('Expected signature:', signature);
"
```

Compare this with the `X-Webhook-Signature` header from the incoming request.

**Wrong Content-Type:**
The webhook endpoint requires `POST` with `Content-Type: application/json`.

**Wrong HTTP Method:**
Verify the sending service uses POST, not GET.

---

## 7. Content Generation Issues

### 7.1 Groq API Errors

**Symptoms:**

- Article generation fails with error code E003 (Groq API timeout).
- Groq returns invalid JSON or incomplete content.
- Quality gates fail on generated content.

**Causes and Solutions:**

**Groq API Key Invalid:**

```bash
# Test your Groq API key
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_GROQ_KEY" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log(j.data ? 'API OK - ' + j.data.length + ' models' : 'Error:', j.error?.message);
"
```

**Groq Rate/Quota Limit:**

- Check the Groq dashboard for usage.
- Add delay between generation calls in the cron configuration.
- Verify retry logic in `GroqWriter.ts` (exponential backoff recommended).

**JSON Mode Not Enforcing:**
If Groq returns malformed JSON despite JSON mode being enabled:

- Ensure `response_format: { type: 'json_object' }` is set in the Groq API call.
- The `GroqWriter` has a `fixMalformedJson()` fallback parser.

**Content Quality Gate Failed (E004):**

1. Check logs for the specific quality gate failure.
2. Common causes: insufficient data points (<2), banned phrase detected, low word count.
3. Increase SerpAPI news results fetched, expand content guide requirements.
4. Use `force=true` in the generate API to bypass quality gates (not for production).

### 7.2 SerpAPI Returns Empty Results

**Symptoms:**

- Trend finder finds no trends (error code E002).
- Keyword validation returns zero volume or difficulty.
- Content guide has fewer than 2 data points.

**Causes and Solutions:**

**No Trending Data for Current Time:**
SerpAPI trend data varies by time of day and day of week.

- Run trendMonitor at different times (morning vs evening, weekday vs weekend).
- Expand geo parameters to include more countries.
- Reduce minimum volume threshold: `MIN_SEARCH_VOLUME=200`.

**Search Query Too Specific:**

- Broaden the modifier pool to include more generic terms.
- Verify individual head terms have sufficient volume before generating combinations.

**SerpAPI Plan Limitations:**
Some plans limit the number of results. Check your plan features in the SerpAPI dashboard.

---

## 8. SEO Issues

### 8.1 Sitemap Not Updating

**Symptoms:**

- Sitemap does not include new articles.
- Sitemap still shows deleted or archived articles.

**Causes and Solutions:**

**Cron Not Running:**

```bash
# Manually trigger sitemap generation
node -e "
const { sitemapGenerator } = require('./cron/sitemapGenerator');
sitemapGenerator({ dryRun: true }).then(console.log).catch(console.error);
"
```

**Cache Not Invalidated:**

```bash
# Clear sitemap cache
rm -rf cache/sitemap/*
pnpm --filter backend dev
```

**Publisher Not Triggering Update:**
Check that `Publisher.ts` calls `SitemapManager.updateSitemap()` after publishing.

### 8.2 Google Not Indexing

**Symptoms:**

- Google Search Console shows 0 indexed pages after 2+ weeks.
- `site:yourdomain.com` returns no results.

**Causes and Solutions:**

**Robots.txt Blocking Crawlers:**

```bash
curl -s https://yourdomain.com/robots.txt
# Should NOT Disallow /article/, /category/, or search paths
```

**Noindex Tag Present:**

```bash
curl -s https://yourdomain.com/article/sample-slug/ | grep -i "robots"
# Should show: content="index, follow"
```

**Sitemap Not Submitted:**

1. Go to Google Search Console.
2. Navigate to "Sitemaps."
3. Submit: `https://yourdomain.com/api/sitemap`
4. Check status after 24-48 hours.

**New Domain Sandbox:**
Google applies a "sandbox" to new domains (2-4 weeks for initial trust).

- Continue publishing consistently.
- The sandbox diminishes after 30-60 days.
- Submit individual URLs via Search Console's URL Inspection tool.

### 8.3 Meta Descriptions Too Short or Too Long

**Symptoms:**

- SEO audit flags meta descriptions as too short (<140) or too long (>165).
- Google truncates descriptions in SERP preview.

**Causes and Solutions:**

**Groq Not Following Length Constraints:**

```bash
# Check meta description lengths
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const articles = await prisma.article.findMany({
    select: { slug: true, metaDescription: true }
  });
  articles.forEach(a => {
    const len = a.metaDescription?.length || 0;
    if (len < 140 || len > 165) {
      console.log(a.slug + ': ' + len + ' chars — ' + (len < 140 ? 'TOO SHORT' : 'TOO LONG'));
    }
  });
  await prisma.\$disconnect();
}
check();
"
```

Add post-generation truncation in `SEOOptimizer.ts`.

---

## 9. General Debugging Tips

### 9.1 Enable Debug Logging

```bash
# Run with debug level logging
LOG_LEVEL=debug pnpm --filter backend dev

# Or set it in .env
LOG_LEVEL=debug
```

### 9.2 Check Log Files

| Issue           | Log File              | Location        |
| --------------- | --------------------- | --------------- |
| Cron failure    | `morning_article.log` | `logs/cron/`    |
| Cron failure    | `evening_article.log` | `logs/cron/`    |
| Trend discovery | `trend_monitor.log`   | `logs/cron/`    |
| SEO audit       | `audit_*.log`         | `logs/audit/`   |
| API error       | `error.log`           | `logs/backend/` |
| Application     | `app.log`             | `logs/backend/` |
| PM2 output      | `backend-out.log`     | `logs/pm2/`     |
| PM2 errors      | `backend-error.log`   | `logs/pm2/`     |

### 9.3 Run Cron Scripts Manually

```bash
# Dry-run mode (no side effects)
node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true, verbose: true }).then(console.log).catch(console.error);
"

# Live mode
node -e "
const { morningArticle } = require('./cron/morningArticle');
morningArticle().then(console.log).catch(console.error);
"
```

### 9.4 Test Individual Components

```bash
# 1. Test Node.js version
node -v

# 2. Test Prisma connectivity
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('Database: OK'))
  .catch(e => console.error('Database: FAILED -', e.message))
  .finally(() => prisma.\$disconnect());
"

# 3. Test SerpAPI
curl -s "https://serpapi.com/search.json?q=test&api_key=$SERPAPI_KEY&num=1" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log('SerpAPI:', j.search_metadata?.status || 'FAILED');
"

# 4. Test Groq API
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log('Groq:', j.data ? 'OK (' + j.data.length + ' models)' : 'FAILED');
"

# 5. Test cache directory
node -e "
const fs = require('fs');
const testFile = 'cache/test.txt';
fs.writeFileSync(testFile, 'test');
console.log(fs.readFileSync(testFile, 'utf8') === 'test' ? 'Cache: OK' : 'Cache: FAILED');
fs.unlinkSync(testFile);
"
```

### 9.5 Check Directory Permissions

```bash
# Check permissions of critical directories
ls -la cache/
ls -la logs/
ls -la backend/prisma/
```

### 9.6 Common Quick Fixes

| Issue                           | Quick Fix                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| All API endpoints returning 500 | Check `logs/backend/error.log`, look for Prisma or config errors |
| Cron jobs not executing         | Verify the Node.js process is running with `pm2 status`          |
| Articles not publishing         | Check database connectivity with the Prisma test above           |
| Cache not working               | Run `chmod -R 755 cache/`, verify `CACHE_ENABLED=true` in `.env` |
| SerpAPI errors                  | Verify API key, check plan quota in SerpAPI dashboard            |
| Groq returning garbage          | Check `response_format` parameter, reduce temperature to 0.3     |
| Migration fails                 | Run `npx prisma migrate reset` then retry                        |
| Slow page loads                 | Check Cloudflare cache status, verify Next.js ISR is working     |
| Duplicate article slugs         | Check the articles table for duplicates                          |

### 9.7 Reset and Restart Sequence

If the system is in a bad state, follow this sequence:

```bash
# 1. Check logs to understand the issue
tail -100 logs/backend/error.log

# 2. Restart services
pm2 restart all

# 3. If still failing, reset database (dev only)
npx prisma migrate reset
pnpm seed

# 4. If still failing, clean install
rm -rf node_modules
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm seed
pnpm build

# 5. Restart clean
pm2 restart all
```
