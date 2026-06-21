# Architecture — GameDayWire

System design overview covering philosophy, tech stack, data flow, caching strategy, scaling considerations, and expansion roadmap.

---

## 1. System Overview

### 1.1 Purpose

A fully automated, programmatic SEO-driven blog system that generates 2 original articles daily (8 AM and 7 PM UTC) targeting sports and entertainment audiences across 8 English-speaking countries. The system uses SerpAPI for all search data, Groq for AI content generation, and follows Rank Math SEO principles to produce high-quality, non-AI-slop content.

### 1.2 Core Philosophy

**No AI Slop.** The system does not summarize existing articles. Instead, it uses a **Content Guide Engine** that forces the AI to write original, structured content based on topic research, data points, and narrative frameworks. Every article is built from a **template + data injection + narrative rules**, never from regurgitating what already exists on the web. Articles without sufficient data points are rejected and regenerated with expanded SerpAPI queries.

### 1.3 Core Principles

| Principle                    | Implementation                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| **No AI Slop**               | Content Guide Engine forces original analysis, not article summaries                                     |
| **SEO-First**                | Every article follows Rank Math best practices from title to schema                                      |
| **Full Automation**          | Trend discovery to keyword selection to content generation to publishing runs without human intervention |
| **Human Override**           | Sensitive topics, quality failures, and algorithm updates trigger manual review                          |
| **Single API Source**        | SerpAPI handles all search data needs — trends, SERP, news, keywords, PAA                                |
| **Production-Grade Node.js** | Next.js SSR + Express API + Prisma/SQLite on any Node.js host                                            |

### 1.4 Data Flow

```
SerpAPI (Search Data) -> Express Backend (Services) -> SQLite (via Prisma)
                                |
                                v
                          Groq API (AI Writer)
                                |
                                v
                      Content Guide (Structured Instructions)
                                |
                                v
            Published Articles -> Next.js (SSR/ISR) -> Cloudflare CDN -> Visitor
```

---

## 2. Technology Stack

### 2.1 Layer Breakdown

| Layer               | Technology                               | Version                  | Purpose                                               |
| ------------------- | ---------------------------------------- | ------------------------ | ----------------------------------------------------- |
| **Frontend**        | Next.js (App Router)                     | 15.x                     | SSR pages, ISR, API route proxies, SEO meta rendering |
| **Styling**         | Tailwind CSS                             | 4.x                      | Utility-first responsive design                       |
| **Backend**         | Express.js                               | 4.x                      | REST API endpoints, business logic services           |
| **Runtime**         | Node.js                                  | 20+ (22 LTS recommended) | JavaScript runtime for all processes                  |
| **Database**        | SQLite via Prisma ORM                    | 6.x                      | File-based database (upgradeable to PostgreSQL)       |
| **Search Data**     | SerpAPI                                  | REST API v1              | Trends, SERP analysis, keyword validation, news, PAA  |
| **AI Engine**       | Groq API                                 | REST API                 | Content generation via Llama 4 / Mixtral              |
| **Cache**           | Next.js ISR + Express in-memory + SQLite | —                        | Multi-layer caching                                   |
| **CDN**             | Cloudflare                               | Free tier                | Global asset delivery, SSL, DDoS protection           |
| **Cron**            | node-cron                                | —                        | Scheduled task execution (9 jobs)                     |
| **Testing**         | Vitest + Playwright                      | —                        | Unit, integration, e2e testing                        |
| **Package Manager** | pnpm                                     | 9+                       | Monorepo workspace management                         |
| **Version Control** | Git                                      | 2.x+                     | Source code management                                |

### 2.2 Why This Stack?

| Decision                 | Rationale                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Next.js (App Router)** | Hybrid SSR/SSG/ISR for SEO-optimized pages, built-in image optimization, first-class TypeScript support      |
| **Express.js**           | Lean, well-understood backend for API endpoints and cron orchestration; easy to deploy anywhere              |
| **Prisma + SQLite**      | Zero-config database setup with type-safe queries; migration to PostgreSQL is a one-line change              |
| **pnpm workspaces**      | Efficient monorepo management with shared TypeScript configs across frontend/backend/cron                    |
| **SerpAPI (exclusive)**  | Single provider for all search data — trends, SERP, news, keywords, PAA — simplifies billing and rate limits |
| **Groq API**             | Fast inference (~800 tokens/sec) with Llama 4, cost-effective at ~$5-10/month for 60 articles                |

### 2.3 Node.js Requirements

- **Runtime:** Node.js 20+ (22 LTS recommended)
- **Package Manager:** pnpm 9+
- **Environment:** Any Node.js-capable host (development: local machine; production: VPS, Docker, Railway, Render, etc.)

### 2.4 API Services

**SerpAPI** — exclusive search data provider for trends, SERP analysis, keyword validation, news, People Also Ask, and related searches. All queries cached with tiered TTLs (1 hour for news, 24 hours for keyword data, 7 days for SERP analysis). Rate limit management with exponential backoff retry.

| Data Need                  | SerpAPI Endpoint                    | Purpose                                                  |
| -------------------------- | ----------------------------------- | -------------------------------------------------------- |
| Trending searches          | `trending_searches`                 | Discover what's trending now in sports/entertainment     |
| Related queries            | `related_searches`                  | Expand head terms into long-tail keyword matrices        |
| Search volume & difficulty | `keyword_data`                      | Validate keyword viability (500+ volume, <40 difficulty) |
| SERP competitor analysis   | `search.json`                       | Extract top 10 content, identify gaps, analyze structure |
| People Also Ask            | `related_questions`                 | Generate FAQ sections and subheadings                    |
| Featured snippets          | `answer_box`                        | Understand Google's preferred content format             |
| News results               | `news_results`                      | Source fresh data points and quotes for articles         |
| Local trends               | `trending_searches` with geo params | Validate geo-relevance across target countries           |

**Cost Efficiency:** Single API provider means simplified billing, unified rate limits, and consistent data formatting. Estimated SerpAPI cost: **$50-150/month** depending on query volume.

| Purpose            | Endpoint            | Parameters                             | Frequency                     | Cost Estimate   |
| ------------------ | ------------------- | -------------------------------------- | ----------------------------- | --------------- |
| Trend discovery    | `trending_searches` | `geo`, `hl`                            | Every 3 hours                 | ~$15/month      |
| SERP analysis      | `search.json`       | `q`, `num=10`, `hl`, `gl`              | Per article (2x daily)        | ~$30/month      |
| News data points   | `search.json`       | `q`, `tbm=nws`, `tbs=qdr:h`            | Per article (2x daily)        | ~$20/month      |
| PAA extraction     | `search.json`       | `q`, `num=1`, `related_questions=true` | Per article (2x daily)        | ~$15/month      |
| Related searches   | `search.json`       | `q`, `num=1`, `related_searches=true`  | Per article + daily refresh   | ~$20/month      |
| Keyword validation | `search.json`       | `q`, `num=1`                           | Per keyword in matrix (batch) | ~$30/month      |
| Position tracking  | `search.json`       | `q=site:yourdomain.com`                | Weekly audit                  | ~$10/month      |
| **Total**          |                     |                                        |                               | **~$140/month** |

**Groq API** — AI content generation via `/openai/v1/chat/completions`. Primary model: `llama-4-70b` (fast inference, ~800 tokens/sec). Fallback: `mixtral-8x7b`. Configuration: temperature 0.3, max tokens 4096, top-p 0.9, JSON mode enabled. Retry up to 3 attempts with 5-second delay. Timeout: 60s for generation, 30s for quality validation.

**Google Indexing API** — URL notification for new/updated articles via `/v3/urlNotifications:publish`. OAuth 2.0 service account authentication. Scope: `https://www.googleapis.com/auth/indexing`.

### 2.5 Newsletter Subscription System

The frontend includes a newsletter subscription feature in the article sidebar. The component (`NewsletterSubscribe`) is a client-side React component that validates email format, POSTs to `/api/subscribe`, and displays success/error states.

**Data flow:**

```
User enters email -> NewsletterSubscribe (client component) -> POST /api/subscribe
-> Next.js Route Handler -> In-memory Set<string> (production: DB / SendGrid / Mailchimp)
-> JSON response -> Component displays success or error message
```

**Backend (Next.js Route Handler at `frontend/app/api/subscribe/route.ts`):**
- Accepts POST with `{ email: string }` body
- Validates email format via regex
- Stores email in an in-memory `Set<string>` (ephemeral; resets on restart)
- Returns 200 on success, 409 for duplicate, 400 for invalid email, 500 on error
- Logs subscription events to console

**Production path:** Replace in-memory storage with a database write (Prisma) and integrate a transactional email service (SendGrid, Mailchimp, or Resend) for confirmation emails.

### 2.6 Target Geography

**Primary Markets (Tier 1 — highest CPC/ad value):**

- United States, United Kingdom, Canada

**Secondary Markets (Tier 2 — strong traffic, decent CPC):**

- Australia, Ireland, New Zealand

**Tertiary Markets (Tier 3 — volume boosters):**

- South Africa, India (English-speaking segment)

**Geo-Detection Strategy:** Content is not geo-locked. The system detects visitor IP and subtly adjusts:

- Currency references (USD to GBP to CAD to AUD)
- Time zone references in articles ("kickoff at 3 PM ET / 8 PM GMT")
- Local sports league mentions (NFL for US, Premier League for UK, AFL for Australia)
- Published times staggered to maximize global reach: 8 AM UTC captures European morning traffic, 7 PM UTC captures US afternoon/evening and Australian next-morning traffic

---

## 3. Caching Strategy

### 3.1 Cache Layers

| Layer             | Type                | TTL        | Storage              | Invalidation          |
| ----------------- | ------------------- | ---------- | -------------------- | --------------------- |
| CDN               | Edge cache          | 1 hour     | Cloudflare           | Purge on publish      |
| Next.js ISR       | Static regeneration | 1-24 hours | Next.js build cache  | Revalidate on request |
| Express in-memory | API response cache  | Variable   | Express memory cache | On data change        |
| SQLite (Prisma)   | Query cache         | 10 minutes | Database             | Automatic             |

### 3.2 Cache Invalidation Rules

| Event                  | Invalidated Caches                                          |
| ---------------------- | ----------------------------------------------------------- |
| New article published  | Homepage, category pages, sitemap, RSS, tag pages           |
| Article updated        | Article page, homepage, category, sitemap, related articles |
| Article deleted        | All referencing pages, sitemap, RSS, redirects              |
| Trend data refreshed   | Trends API cache, homepage trending section                 |
| Keyword matrix updated | Keywords API cache                                          |
| SEO audit completed    | Audit logs, health check API                                |

---

## 4. Security Architecture

### 4.1 Threat Model

| Threat              | Mitigation                                                 |
| ------------------- | ---------------------------------------------------------- |
| API key exposure    | Store in `.env` outside web root; listed in `.gitignore`   |
| SQL injection       | Prisma ORM (parameterized queries); no raw SQL             |
| XSS                 | Output encoding in Next.js; CSP headers via next.config.ts |
| Rate limiting abuse | IP-based rate limiting (100 req/hour per endpoint)         |
| DDoS                | Cloudflare free tier DDoS protection; rate limiting        |

### 4.2 API Key Management

| Key             | Storage     | Rotation  | Access            |
| --------------- | ----------- | --------- | ----------------- |
| SerpAPI         | `.env` file | Quarterly | Service role only |
| Groq API        | `.env` file | Quarterly | Service role only |
| Google Indexing | `.env` file | Annually  | Service role only |

---

## 5. Scaling Considerations

### 5.1 Current Capacity (Single Node)

| Metric              | Capacity              | Bottleneck                 |
| ------------------- | --------------------- | -------------------------- |
| Articles/day        | 2 (configurable to 5) | Groq API rate limits       |
| Concurrent visitors | ~500                  | Node.js event loop, SQLite |
| API calls/day       | ~150                  | SerpAPI plan limits        |
| Storage             | Unlimited             | Filesystem                 |

### 5.2 Upgrade Path

| Stage   | Trigger          | Action                                    | Cost     |
| ------- | ---------------- | ----------------------------------------- | -------- |
| Stage 1 | Traffic >1K/day  | Cloudflare Pro ($20/mo)                   | +$20/mo  |
| Stage 2 | Traffic >5K/day  | Add Redis cache; switch to PostgreSQL     | +$40/mo  |
| Stage 3 | Traffic >20K/day | Dedicated VPS (Node.js cluster)           | +$100/mo |
| Stage 4 | Articles >5/day  | Upgrade SerpAPI plan                      | +$50/mo  |
| Stage 5 | Global audience  | Multi-region CDN + database read replicas | +$30/mo  |

### 5.3 Performance Optimization

| Technique             | Implementation                        | Impact                             |
| --------------------- | ------------------------------------- | ---------------------------------- |
| Next.js ISR           | Static regeneration for article pages | Near-zero latency for cached pages |
| Cloudflare caching    | Edge cache for static assets          | 50% reduced origin load            |
| Image WebP conversion | Sharp/next/image auto-convert         | 60% smaller file sizes             |
| Prisma query caching  | Strategic database indexes            | 40% faster queries                 |
| Response compression  | Express compression middleware        | Reduced bandwidth                  |

---

## 6. Admin System

### 6.1 Purpose

The admin system provides manual oversight, content management, and performance monitoring for the GameDayWire platform. It allows administrators to:

- View dashboard statistics (article counts, traffic summaries, quality scores)
- Manage individual articles (edit metadata, change status, view analytics)
- Add and remove HTML links on articles (internal and external)
- Perform full CRUD on categories with reassignment safety
- View time-series analytics (daily/weekly/monthly page views)

### 6.2 Authentication Model

Admin access uses a **shared-secret bearer token** approach — no user accounts or passwords. The `ADMIN_TOKEN` environment variable (64-char hex string) is set in `.env`. The admin login endpoint (`POST /api/admin/auth/login`) accepts the token in the request body and returns a session token on success. All subsequent admin API calls include the session token in the `Authorization: Bearer` header.

**Token flow:**

```
Admin enters token → POST /api/admin/auth/login → session token returned
→ Session token stored in React context → Bearer header on all admin API calls
→ Session expires after 24 hours → re-authentication required
```

**Why shared-secret?** The system has no multi-user needs — a single admin manages deployment. A full user model (registration, roles, sessions) would add unnecessary complexity. The shared-secret approach is simple, auditable (token in logs), and sufficient for this use case.

### 6.3 Link Management Architecture

The `link_graph` table is the **source of truth** for all links. Each link record includes: `articleId`, `url`, `anchorText`, `type` (internal/external), `position`, and `sourceName`. Articles also store links as a JSON array in their `internalLinks` and `externalLinks` fields for fast frontend rendering.

**Architecture:**

- **Write path:** Admin UI → LinkService → upsert `link_graph` → sync JSON into Article record
- **Read path:** Article detail page reads JSON links from Article record (no JOIN needed)
- **Sync:** `syncLinkGraph()` ensures Article JSON is always consistent with `link_graph` table

### 6.4 Category Management Architecture

Categories use a proper `Category` model with a unique slug. The relationship between articles and categories is **many-to-many** via an explicit `ArticleCategory` join table. This allows articles to belong to multiple categories (e.g., "NBA Finals" could be both "Sports" and "Basketball").

**Operations:**

- **Create:** Validate slug uniqueness, create Category record
- **Update:** Update name/slug/description, validate slug uniqueness
- **Delete:** If category has articles, reject unless `reassign_to` is provided with a target category UUID
- **Reassign:** Move all article_category entries from deleted category to target category

### 6.5 Analytics Data Flow

Page view tracking uses a **daily-aggregated** `PageView` model keyed by `(articleId, date)`:

```
Visitor loads article → Next.js page → GET /api/track?article_id=X
→ AnalyticsService.trackPageview() → Prisma upsert on page_views(articleId, date)
→ pageviews += 1, uniqueVisitors calculated via IP dedup (or client-side storage)
```

**Why daily aggregation?** Real-time per-click analytics is overkill for a programmatic SEO blog. Daily granularity is sufficient for trend analysis and article performance comparison. The unique constraint on `(articleId, date)` enables upsert semantics — subsequent views on the same day increment the counter rather than creating new rows.

---

## 7. Expansion Roadmap

### Phase 1: Foundation (Month 1)

- 60 articles published (2/day)
- Google Search Console verification and sitemap submission
- Basic analytics setup (Google Analytics 4 or Plausible)
- Social media automation (auto-share published articles to Twitter/X)

### Phase 2: Authority (Months 2-3)

- 180+ articles in index
- Begin ranking for long-tail keywords
- Apply for Google AdSense
- Add affiliate links where relevant (Amazon, sports merchandise, streaming services)
- Build email newsletter capture

### Phase 3: Scale (Months 4-6)

- 360+ articles
- Programmatic SEO expansion: auto-generate location-specific variants (best sports bars in [city], [team] fans in [country], [event] watch parties [city])
- Newsletter with weekly digest of top articles
- Sponsored content pipeline

During Phase 1, the admin dashboard is available for monitoring article count, traffic trends, and content quality. Admin access is configured via `ADMIN_TOKEN` and available immediately at `/admin/*`.

### Phase 4: Monetization (Month 6+)

- Google AdSense active and optimized
- Mediavine or AdThrive application (requires 50K+ sessions/month)
- Affiliate revenue from sports betting (where legal), streaming services, merchandise
- Sponsored articles and brand partnerships
- Premium content tier (exclusive analysis, early access)

---

## 8. Disaster Recovery

### 7.1 Backup Strategy

| Component       | Frequency | Method              | Retention  |
| --------------- | --------- | ------------------- | ---------- |
| SQLite database | Daily     | `cp` or Prisma dump | 30 days    |
| Source code     | On commit | Git repository      | Indefinite |
| Cache files     | None      | Regenerable         | N/A        |

### 7.2 Business Continuity

| Risk            | Mitigation                                                            |
| --------------- | --------------------------------------------------------------------- |
| SerpAPI outage  | Cache trending data for 24 hours; use fallback trends from RSS feeds  |
| Groq API outage | Queue articles for retry; use cached content guides for 48 hours      |
| Server failure  | Restore from Git; `pnpm install`, `pnpm migrate deploy`, `pnpm start` |

---

## 9. Maintenance Schedule

| Task                             | Frequency | Owner          | Duration  |
| -------------------------------- | --------- | -------------- | --------- |
| Review failed generations        | Daily     | System + Human | 15 min    |
| Check API usage and costs        | Weekly    | Human          | 10 min    |
| Review SEO metrics dashboard     | Weekly    | Human          | 30 min    |
| Update content templates         | Monthly   | Human          | 2 hours   |
| Refresh keyword matrix modifiers | Monthly   | System         | Automatic |
| Audit internal link health       | Monthly   | System         | Automatic |
| Review and update banned phrases | Quarterly | Human          | 30 min    |
| Rotate API keys                  | Quarterly | Human          | 1 hour    |
| Full security audit              | Quarterly | Human          | 4 hours   |
| Performance optimization review  | Quarterly | Human          | 2 hours   |
| Disaster recovery drill          | Annually  | Human          | 4 hours   |
| Architecture review              | Annually  | Human          | 8 hours   |
