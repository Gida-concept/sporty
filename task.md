# Task: Build GameDayWire — Root → Frontend → Backend

## Objective

Build the entire GameDayWire programmatic SEO blog engine from scratch. This is a greenfield project — zero source code exists, only documentation. The build follows a **frontend-first** approach: root monorepo, then frontend (with mock data), then backend, then connect and ship.

**Stack:** pnpm monorepo → Next.js 15 App Router + Tailwind CSS → Express.js + Prisma ORM + SQLite → SerpAPI + Groq API + Google Indexing API

---

## Build Order Overview

| Phase  | What                                                                         | Est. Files | Est. Tasks |
| ------ | ---------------------------------------------------------------------------- | ---------- | ---------- |
| **0**  | Root monorepo setup (pnpm, tsconfig, git, env, eslint, prettier)             | 8 config   | 1          |
| **1**  | Frontend foundation — Next.js, Tailwind, layout, UI primitives, static pages | 15+ files  | 2-3        |
| **2**  | Frontend pages — article detail, category, tag, SEO pages, dynamic routes    | 15+ files  | 2-3        |
| **3**  | Frontend API client library (mock-data-based initially)                      | 5 files    | 1          |
| **4**  | Backend foundation — Express app, middleware, config, health endpoint        | 10+ files  | 1-2        |
| **5**  | Database — Prisma schema (10 models), migrations, seed script                | 4 files    | 1          |
| **6**  | External API clients — SerpAPI, GroqAPI, GoogleIndexingAPI                   | 3 files    | 1          |
| **7**  | Backend core services (8 services — TrendFinder → Publisher)                 | 9+ files   | 2-3        |
| **8**  | Backend SEO & support services (10 services)                                 | 10 files   | 1          |
| **9**  | Backend admin services (4 services)                                          | 4 files    | 1          |
| **10** | Backend public API routes (9 endpoints)                                      | 9 files    | 1-2        |
| **11** | Backend admin API routes (13 endpoints)                                      | 7 files    | 1          |
| **12** | Connect frontend to real backend, remove mocks                               | 3 files    | 1          |
| **13** | Admin frontend — auth, dashboard, CRUD pages, components                     | 15+ files  | 2-3        |
| **14** | Cron jobs (9 scheduled tasks)                                                | 9 files    | 1-2        |
| **15** | Tests — backend unit + integration, frontend, e2e                            | 20+ files  | 2-3        |
| **16** | Docker + deployment config                                                   | 3 files    | 1          |

---

## Phase 0: Root Monorepo Setup

**Goal:** Initialize the pnpm workspace with shared TypeScript configs, linting, formatting, environment variable templates, and gitignore.

### Files to Create

| File                  | Purpose                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`        | Root workspace — shared scripts (dev, build, test, lint, typecheck, format, seed), devDependencies (typescript, eslint, prettier, @types/node, concurrently) |
| `pnpm-workspace.yaml` | Workspace packages: `frontend/`, `backend/`, `cron/`                                                                                                         |
| `tsconfig.json`       | Base TypeScript config — target ES2022, module NodeNext, strict mode, paths alias, extended by all packages                                                  |
| `.gitignore`          | node*modules, .env, dist/, .next/, *.db, cache/, coverage/, \_.log                                                                                           |
| `.env.example`        | 35+ variables from getting-started.md (SERPAPI_KEY, GROQ_API_KEY, SITE_URL, DATABASE_URL, PORT, ADMIN_TOKEN, etc.)                                           |
| `.prettierrc`         | Prettier — semi:true, singleQuote:true, tabWidth:2, trailingComma:all                                                                                        |
| `.eslintrc.cjs`       | ESLint — @typescript-eslint recommended, prettier plugin, import ordering                                                                                    |
| `README.md`           | Root project readme — badge row, quick start, stack, links to docs                                                                                           |

### Key Details

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\"",
    "build": "pnpm --filter backend build && pnpm --filter frontend build",
    "start": "concurrently \"pnpm --filter backend start\" \"pnpm --filter frontend start\"",
    "test": "pnpm --filter backend test",
    "test:e2e": "pnpm --filter frontend test:e2e",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "seed": "pnpm --filter backend seed",
    "cron:dry-run": "node -e \"require('./cron/' + process.argv[1])?.({dryRun:true}).then(console.log).catch(console.error)\""
  }
}
```

**tsconfig.json base:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Outcome

- `pnpm install` installs all dependencies
- `pnpm -r typecheck` passes across all packages (once they exist)
- No runtime yet — this is foundation only

---

## Phase 1: Frontend Foundation

**Goal:** Bootstrap Next.js 15 App Router with Tailwind CSS, create root layout, shared UI components, layout components, and all static SEO pages. All data is static/mock initially.

### Files to Create

**Next.js init:**

- `frontend/package.json` — next@15, react@19, react-dom@19, tailwindcss@4, @tailwindcss/postcss, typescript, @types/react, @types/node, vitest, @testing-library/react, @playwright/test
- `frontend/tsconfig.json` — extends ../tsconfig.json, jsx:preserve, module:esnext, paths: @/_ → src/_
- `frontend/next.config.ts` — images domains, rewrites (API proxy /api/\* → backend), headers (CSP, security), ISR revalidate defaults
- `frontend/tailwind.config.ts` — theme colors (sports/entertainment palette), font family (Inter + system), content paths, dark mode class
- `frontend/postcss.config.mjs` — tailwindcss + autoprefixer
- `frontend/vitest.config.ts` — react plugin, jsdom environment, path aliases

**Root layout and global styles:**

- `frontend/app/globals.css` — Tailwind directives, custom properties, base resets, scrollbar styles
- `frontend/app/layout.tsx` — Root layout: Inter font via next/font, SEO metadata (title template, description, OG image), JsonLd provider, viewport config, theme color
- `frontend/app/not-found.tsx` — Custom 404 page with navigation

**Shared UI primitives (`frontend/components/ui/`):**

- `Button.tsx` — Reusable button with variants (primary, secondary, ghost, danger), sizes (sm, md, lg), loading state, disabled state
- `Card.tsx` — Generic card container with optional image, header, footer slots
- `Badge.tsx` — Category/status badge with color mapping
- `Pagination.tsx` — Page navigation with prev/next, page numbers, ellipsis support

**Layout components (`frontend/components/layout/`):**

- `Header.tsx` — Site header with logo, nav (Home, Sports, Entertainment), search bar, mobile hamburger menu
- `Footer.tsx` — Site footer with category links, static page links (About, Privacy, Terms, Disclaimer), copyright, RSS link
- `Sidebar.tsx` — Sidebar with trending topics (mock), related articles, newsletter signup placeholder
- `SearchBar.tsx` — Search input with submit handler, autocomplete stub

**SEO components (`frontend/components/seo/`):**

- `JsonLd.tsx` — JSON-LD schema injection component (accepts schema object, renders `<script type="application/ld+json">`)
- `MetaTags.tsx` — OG / Twitter card meta tag injection for article pages
- `Breadcrumbs.tsx` — Breadcrumb navigation with JSON-LD schema

**Static pages (`frontend/app/`):**

- `page/about/page.tsx` — About page with E-E-A-T signals (team, mission, methodology)
- `page/contact/page.tsx` — Contact page with form (static)
- `page/privacy-policy/page.tsx` — Privacy Policy (AdSense requirement)
- `page/terms/page.tsx` — Terms of Service
- `page/disclaimer/page.tsx` — Affiliate and AI content disclosure

### Outcome

- `pnpm --filter frontend dev` starts Next.js on :3000
- Homepage loads with header, footer, sidebar (all placeholder content)
- All static pages navigate correctly
- UI primitives (Button, Card, Badge, Pagination) are functional
- 404 page shows on unknown routes

---

## Phase 2: Frontend Pages

**Goal:** Build all dynamic frontend pages — homepage, article detail, category archives, tag archives, sitemap, robots.txt, manifest. Pages render with mock data initially.

### Files to Create

**Homepage:**

- `frontend/app/page.tsx` — Hero section (featured article), latest articles grid, trending topics sidebar section, category quick links

**Article pages:**

- `frontend/app/article/[slug]/page.tsx` — Article detail: SSR + ISR (revalidate:86400), ArticleBody renderer, TableOfContents sidebar, FAQSection, RelatedArticles, ShareButtons, breadcrumbs, JSON-LD, OG meta tags

**Category pages:**

- `frontend/app/category/sports/page.tsx` — Sports category archive with pagination
- `frontend/app/category/entertainment/page.tsx` — Entertainment category archive with pagination
- _(Dynamic category pages can be added later when sub-categories exist)_

**Tag pages:**

- `frontend/app/tag/[tag]/page.tsx` — Tag archive page with article list, SSG

**Dynamic routes:**

- `frontend/app/sitemap.ts` — XML sitemap generation (Next.js built-in route handler)
- `frontend/app/robots.ts` — Dynamic robots.txt with sitemap reference
- `frontend/app/manifest.ts` — PWA manifest

**Article components (`frontend/components/article/`):**

- `ArticleCard.tsx` — Article preview card for listings (image, title, excerpt, date, category badge, read time)
- `ArticleBody.tsx` — Content block renderer (h2, h3, p, ul, ol, blockquote, table, image, code blocks)
- `TableOfContents.tsx` — Auto-generated TOC from h2/h3 headings with scroll spy
- `FAQSection.tsx` — FAQ accordion component with JSON-LD schema
- `RelatedArticles.tsx` — Related article suggestions grid
- `ShareButtons.tsx` — Social sharing (Twitter, Facebook, LinkedIn, copy link)

### Outcome

- Homepage displays article grid (mock data)
- Article pages render with full layout (TableOfContents, FAQ, RelatedArticles, ShareButtons)
- Category/tag archives work with pagination
- sitemap.ts returns valid XML, robots.ts returns proper directives, manifest.ts returns valid PWA manifest

---

## Phase 3: Frontend API Client Library

**Goal:** Build typed API client abstractions and frontend utilities. Initially backed by mock data. Seamlessly switchable to real backend later.

### Files to Create

- `frontend/lib/constants.ts` — Site-wide constants (SITE_NAME, SITE_URL, CATEGORIES, DEFAULT_PAGE_SIZE, CACHE_TTL values)
- `frontend/lib/formatters.ts` — Date formatting (relative, absolute), number formatting (compact, percentage), text utilities (truncate, slugify, reading time)
- `frontend/lib/api-client.ts` — Typed fetch wrapper for public backend API with mock data fallback:
  - `getTrends(params)`, `getKeywords(params)`, `getArticles(params)`, `getArticleBySlug(slug)`
  - `getSitemap(params)`, `getRSS(params)`, `trackPageview(articleId, ref)`
  - Mock data switch: `USE_MOCK_DATA = true` constant — when true, returns typed mock objects; when false, fetches from backend

- `frontend/lib/admin-api.ts` — Authenticated admin API client:
  - `login(token)`, `getDashboardStats()`, `getArticles(filters)`, `getArticleById(id)`
  - `updateArticle(id, data)`, `deleteArticle(id, permanent?)`
  - `addLink(articleId, data)`, `removeLink(articleId, linkId)`
  - `getCategories()`, `createCategory(data)`, `updateCategory(id, data)`, `deleteCategory(id, reassignTo?)`
  - `getAnalytics(params)`
  - Session token management (localStorage, expiry check, auto-redirect on 401)

### Key Details

**Mock data strategy:**

```
// Each function checks a USE_MOCK_DATA flag
const USE_MOCK_DATA = true // Flip to false when backend is ready

// Mock data is typed to match API response schemas exactly
// Uses realistic sports/entertainment content
```

### Outcome

- Frontend pages render with mock data from api-client.ts
- All API calls go through typed interfaces
- Flipping `USE_MOCK_DATA = false` switches to real backend calls
- Admin API client handles auth token lifecycle

---

## Phase 4: Backend Foundation

**Goal:** Bootstrap Express.js server with TypeScript, set up middleware stack, config loader, health endpoint, and all infrastructure.

### Files to Create

- `backend/package.json` — express@4, cors, helmet, compression, express-rate-limit, morgan, @prisma/client, dotenv, node-cron, typescript, tsx, vitest, @types/express, @types/cors, @types/compression, @types/morgan
- `backend/tsconfig.json` — extends ../tsconfig.json, outDir:dist, rootDir:src, include:src
- `backend/vitest.config.ts` — TypeScript support, path aliases, coverage config

**Config:**

- `backend/src/config/index.ts` — Loads .env from project root, validates required vars, exports typed config object with all 35+ env vars with defaults

**Middleware (`backend/src/middleware/`):**

- `errorHandler.ts` — Global error handler, catches unhandled errors, logs to system_logs, returns typed error response
- `rateLimiter.ts` — IP-based rate limiting per endpoint (configurable limits from api-reference.md table), returns 429 with Retry-After header
- `auth.ts` — Token-based authentication for write endpoints (POST /api/generate, POST /api/webhook)
- `adminAuth.ts` — Shared-secret bearer token verification for admin endpoints, validates session token against ADMIN_TOKEN env var
- `validator.ts` — Request body/parameter validation middleware using Zod schemas
- `cache.ts` — In-memory response caching with TTL, configurable per-route, cache invalidation helpers

**App entry:**

- `backend/src/index.ts` — Express app bootstrap:
  1. Config loading
  2. Middleware (cors, helmet, compression, rateLimiter, morgan)
  3. Route registration
  4. Error handler (last)
  5. Server listen on PORT
  6. Health endpoint: `GET /api/health` — checks DB, SerpAPI, Groq, cache

### Outcome

- `pnpm --filter backend dev` starts Express on :3001
- `GET /api/health` returns full health status with all checks
- Rate limiting, CORS, auth middleware functional
- Error handler catches and formats all errors consistently

---

## Phase 5: Prisma Database

**Goal:** Create the complete Prisma schema with all 10 models, generate initial migration, and write the seed script.

### Files to Create

- `backend/prisma/schema.prisma` — Full schema with 10 models:
  - **Category** — id, name (unique), slug (unique), description, createdAt, updatedAt
  - **Trend** — id, query, normalizedQuery, categoryId (FK→Category), searchVolume, growthRate, geo, relatedQueries (JSON), fetchedAt, processed, articleId (FK→Article, unique), trendScore
  - **Keyword** — id, keyword (unique), headTerm, modifier, searchVolume, difficulty, cpc, intent, categoryId (FK→Category), priorityScore, serpFeatures (JSON), status, createdAt, lastValidatedAt, timesTargeted
  - **Article** — id, slug (unique), title, metaDescription, h1, contentHtml, contentBlocks (JSON), keywordId (FK→Keyword), trendId (FK→Trend), wordCount, readingLevel, schemaMarkup (JSON), internalLinks (JSON), externalLinks (JSON), status, generationAttempts, qualityScore, publishedAt, createdAt, updatedAt, lastRefreshedAt, pageviews, avgTimeOnPage, bounceRate, googlePosition
  - **ArticleCategory** — articleId (FK→Article, Cascade), categoryId (FK→Category, Restrict), composite PK
  - **PageView** — id, articleId (FK→Article), date, pageviews, uniqueVisitors, avgTimeOnPage, @@unique([articleId, date])
  - **SeoMetric** — id, articleId (FK→Article), googlePosition, impressions, clicks, ctr, avgPosition, topQueries (JSON), trackedAt
  - **LinkGraph** — id, sourceSlug, targetSlug, anchorText, linkType, contextSnippet, articleId (FK→Article), createdAt, updatedAt
  - **ContentGuide** — id, articleId (FK→Article, unique), keywordId (FK→Keyword), guideData (JSON), serpData (JSON), narrativeAngle, dataPointsCount, contentGaps (JSON), createdAt
  - **SystemLog** — id, logType, message, metadata (JSON), severity, createdAt
- `backend/prisma/migrations/0001_init/` — Generated by `prisma migrate dev`
- `backend/prisma/seed.ts` — Idempotent seed script:
  - 2 categories: Sports, Entertainment
  - 20+ head terms (NBA, NFL, Premier League, LeBron James, Patrick Mahomes, Cristiano Ronaldo, Marvel, Netflix, Taylor Swift, Oscars, streaming services, sports betting, fantasy sports)
  - 10+ modifiers (stats, rumors, highlights, schedule, standings, news, predictions, analysis, history, records)
  - Combined keyword entries from head terms × modifiers

### Outcome

- `npx prisma migrate dev --name init` creates all 10 tables
- `pnpm seed` populates keywords and categories (idempotent — safe to re-run)
- `npx prisma studio` opens GUI with all tables populated

---

## Phase 6: External API Clients

**Goal:** Build strongly-typed wrappers for SerpAPI, Groq API, and Google Indexing API with error handling, retry logic, and caching.

### Files to Create

- `backend/src/lib/SerpAPI.ts` — SerpAPI REST client:
  - Methods: `getTrendingSearches(geo, hl)`, `search(query, params)`, `getNewsResults(query, params)`, `getRelatedQueries(query, params)`, `getKeywordData(query)`, `getAnswerBox(query)`, `getRelatedSearches(query)`
  - Features: rate limit management with exponential backoff retry (3 attempts, 5s delay), API key from config, response caching with TTLs (1h news, 24h keyword, 7d SERP), typed interfaces for all responses
  - Error handling: E001 (rate limit), E002 (empty results) with proper logging

- `backend/src/lib/GroqAPI.ts` — Groq API client:
  - Methods: `generateArticle(contentGuide, options)`, `validateOutput(json)`, `fixMalformedJson(raw)`, `healthCheck()`
  - Configuration: model: llama-4-70b (fallback: mixtral-8x7b), temperature: 0.3, max_tokens: 4096, top_p: 0.9, response_format: { type: "json_object" }
  - Features: retry up to 3 attempts with 5s delay, timeout 60s / 30s, structured prompt builder, cost tracking
  - Error handling: E003 (timeout), E004 (malformed JSON)

- `backend/src/lib/GoogleIndexingAPI.ts` — Google Indexing API client:
  - Methods: `notify(url, type)`, `getStatus(url)`
  - Authentication: OAuth 2.0 service account (JWT client assertion)
  - Features: batch URL notification, error logging, graceful fallback

### Outcome

- SerpAPI client can discover trends, validate keywords, fetch news, extract PAA
- Groq API client can generate articles from Content Guide data
- Google Indexing API client can notify Google of URL changes
- All clients handle errors gracefully with retry + fallback

---

## Phase 7: Backend Core Services

**Goal:** Build the core content pipeline services — TrendFinder → KeywordMatrix → ContentGuide → GroqWriter → ArticleBuilder → SEOOptimizer → SchemaBuilder → Publisher.

### Files to Create

- `backend/src/services/TrendFinder.ts`
  - `discover(category, geos)` — Fetches trending searches via SerpAPI, scores each trend using formula: `Score = (Volume × 0.4) + (GrowthRate × 0.3) + (Recency × 0.2) + (GeoRelevance × 0.1)`
  - `filterByRecency(trends, hours)`, `calculateScore(trend, weights?)`, `getTopTopics(limit?, category?)`
  - Persists scored trends to database

- `backend/src/services/KeywordMatrix.ts`
  - `generateFromHeadTerm(headTerm, category)` — Creates keyword combinations from head term × modifiers
  - `validateWithSerpAPI(keywords)` — Checks search volume, difficulty, CPC via SerpAPI
  - `scoreAndRank(keywords)` — Scores by formula: `Priority = (Volume / difficulty) × intentMultiplier`
  - `getWinningKeyword(trendData)`, `getPendingKeywords(limit?)`, `updateStatus(keywordId, status)`
  - Intent multipliers: informational:1.0, commercial:1.5, transactional:2.0, news:1.3, navigational:0.5

- `backend/src/services/ContentGuide.ts`
  - `generate(keyword, trendData)` — Assembles structured Content Guide from SerpAPI data
  - `extractSubheadings(serpResults)`, `identifyContentGaps(competitorData)`, `determineNarrativeAngle(newsData, trendData)`
  - `validateGuide(guide)` — Ensures guide has ≥2 data points (E007 gate)
  - Output: JSON with keyword, subheadings, narrative angle, data points, structure blueprint

- `backend/src/services/GroqWriter.ts`
  - Wraps GroqAPI client with prompt engineering specific to article generation
  - `generateArticle(contentGuide)` — Builds structured prompt, sends to Groq, parses JSON output
  - `validateOutput(json)`, `fixMalformedJson(raw)`
  - Returns structured content blocks ready for ArticleBuilder

- `backend/src/services/ArticleBuilder.ts`
  - `assemble(keywordData, contentGuide, generatedContent)` — Assembles full Article record
  - Converts content blocks to HTML, generates slug, sets defaults
  - Calls SEOOptimizer for title/meta/h1, TextAnalyzer for readability, SchemaBuilder for JSON-LD
  - Returns complete Article object ready for publishing

- `backend/src/services/SEOOptimizer.ts`
  - `optimizeTitle(keyword, category, intent)` — Applies title formula (6 templates from seo-strategy.md)
  - `generateMetaDescription(keyword, content, maxLength?)`, `validateHeadings(blocks)`
  - `checkKeywordDensity(content, keyword)`, `generateUrlSlug(title)`

- `backend/src/services/SchemaBuilder.ts`
  - `detectSchemaType(content)`, `buildArticleSchema(article)`, `buildFAQSchema(faqList)`
  - `buildBreadcrumbSchema(crumbs)`, `validateSchema(schema)`

- `backend/src/services/Publisher.ts`
  - `publish(articleData)` — Orchestrates end-to-end publishing:
    1. Quality check (7 anti-slop rules, readability, banned phrases, duplicate detection)
    2. Save article to database (status: draft initially)
    3. If auto-publish enabled: set status to published, set publishedAt
    4. Call ImageHandler for featured image, GoogleIndexingAPI if configured
  - `generateHtml(blocks)`, `qualityCheck(article)`

### Key Business Logic

**Anti-slop rules (in Publisher.qualityCheck):**

1. Minimum word count (800)
2. Minimum data points from SerpAPI (≥2 in Content Guide)
3. No banned phrases (list from content-quality.md)
4. Flesch-Kincaid readability between 50-80
5. Original structure (not summarizing existing articles)
6. Content must have ≥3 sections with subheadings
7. Must not be duplicate of existing articles (>85% similarity)

### Outcome

- TrendFinder discovers and scores trends with correct algorithm
- ContentGuide generates structured guides with ≥2 data points
- GroqWriter produces valid JSON articles (requires GROQ_API_KEY)
- Publisher quality gates reject bad content with E004-E007 codes
- Full pipeline: trend → keyword → guide → article → publish

---

## Phase 8: Backend SEO & Support Services

**Goal:** Build all remaining services — TitleEngine, MetaBuilder, SitemapManager, RSSFeed, LinkManager, ImageHandler, ContentRefresher, Notification, MetricsCollector, SERPTracker, TextAnalyzer.

### Files to Create

- `backend/src/services/TitleEngine.ts` — 6 title formula templates, scoring by position/length/sentiment/CTR
- `backend/src/services/MetaBuilder.ts` — Title tag, meta description, OG tags, Twitter cards, canonical URL
- `backend/src/services/SitemapManager.ts` — XML sitemap index, paginated article sitemaps, priority logic, ping search engines
- `backend/src/services/RSSFeed.ts` — RSS 2.0 with full-text, media:content, categories, Google Discover format
- `backend/src/services/LinkManager.ts` — TF-IDF opportunity detection, Tier 1/2 citations, link graph rebuild, broken link checking
- `backend/src/services/ImageHandler.ts` — Featured image generation, WebP conversion, alt text
- `backend/src/services/ContentRefresher.ts` — Stale detection by age/performance, refresh guide, SEO value preservation
- `backend/src/services/Notification.ts` — Multi-channel alerts (email via nodemailer, webhook), severity routing
- `backend/src/services/MetricsCollector.ts` — Traffic aggregation, Search Console data, dashboard stats
- `backend/src/services/SERPTracker.ts` — Google position via SerpAPI site: queries, movement alerts
- `backend/src/services/TextAnalyzer.ts` — Flesch-Kincaid scoring, banned phrase detection, duplicate similarity (cosine), sentiment, keyword density

### Key Details

**Title formula templates (TitleEngine):**

1. `"[Keyword]: [Compelling Angle]"` — Default for high-volume
2. `"[Number] [Adjective] [Topic] [Year]"` — Listicle format
3. `"How [Keyword] Is Changing [Industry]"` — Trend/analysis
4. `"[Keyword] — Everything You Need to Know"` — Comprehensive guide
5. `"[Question about Keyword]? Here's What..."` — Question format
6. `"[Location] [Topic]: [Local Insight]"` — Geo-targeted

**Tier 1 sources (LinkManager):** ESPN, BBC Sport, Sky Sports, The Athletic, NBA.com, Variety, Hollywood Reporter, Billboard
**Tier 2 sources:** Fox Sports, CBS Sports, Sports Illustrated, Bleacher Report, Yahoo Sports, Rolling Stone, TMZ, E! Online

### Outcome

- All 11 support services implemented
- SitemapManager produces valid XML with correct priority logic
- RSSFeed produces Google-Discover-optimized RSS
- ContentRefresher identifies stale articles correctly

---

## Phase 9: Backend Admin Services

**Goal:** Build admin-specific services for dashboard, article management, category CRUD, and analytics.

### Files to Create

- `backend/src/services/AdminService.ts`:
  - `getDashboardStats()`, `getArticles(filters)`, `getArticleById(id)`, `updateArticle(id, data)`, `deleteArticle(id, permanent?)`

- `backend/src/services/CategoryService.ts`:
  - `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id, reassignToId?)` — E009 if articles exist and no target

- `backend/src/services/LinkService.ts`:
  - `addLink(articleId, data)`, `removeLink(articleId, linkId)`, `getArticleLinks(articleId)`, `syncLinkGraph(articleId)`

- `backend/src/services/AnalyticsService.ts`:
  - `trackPageview(articleId, ref?)`, `getTimeSeries(options)`, `getArticleAnalytics(articleId)`, `getTopArticles(period, limit?)`

### Admin Auth Flow

```
POST /api/admin/auth/login { token: ADMIN_TOKEN }
  → Create session (uuid, 24h expiry, store in memory Map)
  → Return session token

All admin routes → adminAuth middleware:
  → Extract Bearer token from Authorization header
  → Validate session exists and not expired
  → Pass through or return 401 E010
```

### Outcome

- AdminService provides dashboard stats with correct aggregations
- CategoryService prevents deletion of categories with assigned articles (E009)
- LinkService keeps link_graph and Article JSON in sync
- AnalyticsService upserts page views with (articleId, date) uniqueness

---

## Phase 10: Backend Public API Routes

**Goal:** Build all 9 public API route handlers with validation, rate limiting, caching, and proper error handling.

### Files to Create

- `backend/src/routes/health.ts` — `GET /api/health` — System health check
- `backend/src/routes/trends.ts` — `GET /api/trends` — Trending topics (category, limit, geo, min_volume, format)
- `backend/src/routes/keywords.ts` — `GET /api/keywords` — Keyword matrix (status, category, head_term, limit, offset, sort)
- `backend/src/routes/articles.ts` — `GET /api/articles` — Article list/search (category, status, slug, search, limit, offset, sort, include_body)
- `backend/src/routes/sitemap.ts` — `GET /api/sitemap` — XML sitemap (type, page)
- `backend/src/routes/rss.ts` — `GET /api/rss` — RSS 2.0 feed (limit, category)
- `backend/src/routes/generate.ts` — `POST /api/generate` — Manual generation (auth token, action, keyword, category, slug, force)
- `backend/src/routes/webhook.ts` — `POST /api/webhook` — HMAC-SHA256 webhook receiver
- `backend/src/routes/track.ts` — `GET /api/track` — Page view tracking (article_id, ref)

### Outcome

- All 9 public endpoints respond correctly with proper status codes
- Rate limiting blocks excessive requests
- Cache middleware serves cached responses with correct TTLs
- Validation rejects malformed requests with clear error messages

---

## Phase 11: Backend Admin API Routes

**Goal:** Build all 13 admin API route handlers with bearer token authentication, validation, and rate limiting.

### Files to Create

- `backend/src/routes/admin/auth.ts` — `POST /api/admin/auth/login`
- `backend/src/routes/admin/stats.ts` — `GET /api/admin/stats`
- `backend/src/routes/admin/articles.ts` — `GET /api/admin/articles`, `GET /api/admin/articles/:id`, `PATCH /api/admin/articles/:id`, `DELETE /api/admin/articles/:id`
- `backend/src/routes/admin/categories.ts` — `GET /api/admin/categories`, `POST /api/admin/categories`, `PUT /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`
- `backend/src/routes/admin/analytics.ts` — `GET /api/admin/analytics`
- `backend/src/routes/admin/links.ts` — `POST /api/admin/articles/:id/links`, `DELETE /api/admin/articles/:id/links/:linkId`

### Outcome

- All 13 admin endpoints functional with token auth
- Admin can list/create/update/delete categories with safety checks
- Admin can manage article links (add/remove) with graph sync

---

## Phase 12: Connect Frontend to Backend

**Goal:** Flip the switch — remove mock data, connect frontend to live backend API, verify everything works end-to-end.

### Files to Modify

- `frontend/lib/api-client.ts` — Change `USE_MOCK_DATA = false`, verify all fetch calls match real backend API

### Verification Checklist

- [ ] Homepage renders real article data from backend
- [ ] Article detail page loads full content via API
- [ ] Category archives filter correctly
- [ ] Sitemap.ts serves real sitemap data
- [ ] RSS feed proxy works
- [ ] Health endpoint shows accurate status
- [ ] All API error responses render graceful error states on frontend
- [ ] Search function works end-to-end

### Outcome

- Frontend renders real data from backend
- No mock data remains in production code paths

---

## Phase 13: Admin Frontend

**Goal:** Build the complete admin UI — login, dashboard, article management, category CRUD, link management, analytics charts.

### Files to Create

**Auth infrastructure:**

- `frontend/lib/auth-context.tsx` — React context for admin auth state (login, logout, token management, auto-redirect, 24h session timer)

**Admin pages (`frontend/app/admin/`):**

- `admin/login/page.tsx` — Login form (token input, submit, error state, redirect to dashboard)
- `admin/layout.tsx` — Admin layout with auth guard, AdminSidebar, AdminLayout
- `admin/page.tsx` — Dashboard: StatsCard grid, recent activity, quick links
- `admin/articles/[id]/page.tsx` — Article detail/edit with analytics and link manager
- `admin/categories/page.tsx` — Category CRUD with reassignment dialog
- `admin/analytics/page.tsx` — Analytics dashboard with date range, granularity, chart
- `admin/links/page.tsx` — Link management with add/remove

**Admin components (`frontend/components/admin/`):**

- `AdminLayout.tsx` — Admin app shell with sidebar + header
- `AdminSidebar.tsx` — Navigation sidebar with active state
- `StatsCard.tsx` — Dashboard stat card with icon, label, value, trend
- `ArticleTable.tsx` — Paginated sortable table with status badges
- `ArticleEditor.tsx` — Article metadata editor with validation
- `LinkManager.tsx` — Per-article link add/remove with URL validation
- `CategoryForm.tsx` — Category create/edit with slug auto-generation
- `CategoryTable.tsx` — Category list with article count, actions
- `AnalyticsChart.tsx` — Time-series chart

### Key UX Patterns

**Page states (every admin page):**

1. Loading — Skeleton/spinner while fetching data
2. Empty — Helpful message when no data exists
3. Error — Error message with retry button
4. Data — Full rendered content

**Category delete safety:**

- If category has articles → show reassignment dialog
- If category has no articles → confirm delete directly

### Outcome

- Admin login works with ADMIN_TOKEN
- Dashboard shows live stats from AdminService
- Article list is paginated, sortable, searchable
- Category CRUD works with reassignment safety
- Analytics chart shows time-series data
- All pages handle loading, empty, error, and data states

---

## Phase 14: Cron Jobs

**Goal:** Build all 9 scheduled cron jobs that run the autonomous content pipeline.

### Files to Create

- `cron/package.json` — Dependencies: express (for context), @prisma/client
- `cron/tsconfig.json` — extends ../tsconfig.json

**Jobs:**

- `cron/morningArticle.ts` — Daily 08:00 UTC — Full pipeline: trend → keyword → guide → article → publish
- `cron/eveningArticle.ts` — Daily 19:00 UTC — Same as morning, alternates category
- `cron/trendMonitor.ts` — Every 3 hours — Discover + score trending topics via SerpAPI
- `cron/keywordRefresh.ts` — Daily 02:00 UTC — Regenerate matrix, validate, prune
- `cron/contentRefresh.ts` — Daily 03:00 UTC — Identify stale articles, generate refresh guides
- `cron/sitemapGenerator.ts` — Daily 01:00 UTC — Rebuild sitemap, ping search engines
- `cron/linkUpdate.ts` — Weekly Sunday 04:00 UTC — Rebuild internal link graph
- `cron/seoAudit.ts` — Weekly Sunday 05:00 UTC — Technical SEO audit
- `cron/backup.ts` — Weekly Sunday 06:00 UTC — Database dump, file backup, retention

### Cron Job Pattern

```typescript
interface CronResult {
  success: boolean;
  exitCode: 0 | 1 | 2;
  message: string;
  details?: Record<string, unknown>;
}

export async function execute(options: { dryRun?: boolean } = {}): Promise<CronResult> {
  // Support dry-run mode — simulate without side effects
  // Exit codes: 0=success, 1=error/retry, 2=manual review
}
```

### Scheduler

```typescript
import cron from 'node-cron';
cron.schedule('0 8 * * *', () => morningArticle.execute()); // Daily 08:00
cron.schedule('0 19 * * *', () => eveningArticle.execute()); // Daily 19:00
cron.schedule('0 */3 * * *', () => trendMonitor.execute()); // Every 3 hours
cron.schedule('0 2 * * *', () => keywordRefresh.execute()); // Daily 02:00
cron.schedule('0 3 * * *', () => contentRefresh.execute()); // Daily 03:00
cron.schedule('0 1 * * *', () => sitemapGenerator.execute()); // Daily 01:00
cron.schedule('0 4 * * 0', () => linkUpdate.execute()); // Weekly Sun 04:00
cron.schedule('0 5 * * 0', () => seoAudit.execute()); // Weekly Sun 05:00
cron.schedule('0 6 * * 0', () => backup.execute()); // Weekly Sun 06:00
```

### Outcome

- All 9 cron jobs run on schedule
- Each job supports dry-run mode (--dry-run flag)
- Exit codes: 0=success, 1=error/retry, 2=manual review
- Jobs log to SystemLog table with severity levels

---

## Phase 15: Testing

**Goal:** Comprehensive test coverage — backend unit tests, integration tests, frontend tests, and E2E tests.

### Backend Tests

**Service unit tests (`backend/tests/services/`):**

- TrendFinder (scoring algorithm, filtering, ranking)
- KeywordMatrix (head term expansion, priority scoring)
- ContentGuide (guide assembly, validation)
- GroqWriter (prompt building, JSON validation, malformed JSON repair)
- SEOOptimizer (title templates, heading validation)
- SchemaBuilder (schema generation, validation)
- Publisher (all 7 anti-slop rules, publish flow)
- TextAnalyzer (Flesch-Kincaid, banned phrases, duplicate detection)
- AdminService (dashboard stats, article CRUD)
- CategoryService (CRUD, reassignment, E009 error case)
- AnalyticsService (PageView upsert, time-series)

**Route integration tests (`backend/tests/routes/`):**

- health (response, degraded/critical states)
- trends (query params, caching, errors)
- articles (pagination, filtering, search)
- admin (auth flow, CRUD, rate limiting, error codes)

**Test fixtures (`backend/tests/fixtures/`):**

- Mock SerpAPI responses, Groq responses
- Sample articles, content guides
- Prisma test database setup

### Frontend Tests

- Component rendering tests (Vitest + Testing Library)
- API client mock tests
- Responsive layout tests

### E2E Tests (Playwright)

- Homepage loads and displays articles
- Article detail page renders full content
- Category navigation works
- Admin login flow
- 404 page displays correctly

### Outcome

- 80%+ test coverage on backend services
- All 7 anti-slop rules have dedicated tests
- All API routes have integration tests with mocked services
- E2E tests cover critical user flows

---

## Phase 16: Docker + Deployment

**Goal:** Containerize the application and prepare deployment config.

### Files to Create

- `Dockerfile` — Multi-stage build (dependencies → build → production)
- `docker-compose.yml` — Single service, SQLite volume mounts, health check
- `.dockerignore` — node_modules, .next, .git, \*.db, cache, coverage

### Outcome

- `docker compose up --build` starts the entire application
- Docker health check polls /api/health
- SQLite database persisted via volume mount

---

## Implementation Order Summary

| #   | Phase               | Files | Parallelizable? | Depends On |
| --- | ------------------- | ----- | --------------- | ---------- |
| 0   | Root monorepo       | 8     | —               | —          |
| 1   | Frontend foundation | 15+   | Components yes  | 0          |
| 2   | Frontend pages      | 15+   | Pages yes       | 1          |
| 3   | Frontend API client | 5     | No              | 2          |
| 4   | Backend foundation  | 10+   | Middleware yes  | 0, 3       |
| 5   | Database            | 4     | Yes             | 4          |
| 6   | API clients         | 3     | Yes             | 5          |
| 7   | Core services       | 8     | Per service yes | 6          |
| 8   | SEO & support       | 11    | Per service yes | 6          |
| 9   | Admin services      | 4     | Yes             | 5          |
| 10  | Public routes       | 9     | Yes             | 7, 8       |
| 11  | Admin routes        | 7     | Yes             | 9          |
| 12  | Connect frontend    | 3     | No              | 10, 3      |
| 13  | Admin frontend      | 15+   | Pages yes       | 11, 12     |
| 14  | Cron jobs           | 9     | Yes             | 7, 8       |
| 15  | Tests               | 20+   | Yes             | All        |
| 16  | Docker + deploy     | 3     | Yes             | All        |

---

## Active Task: SerpAPI Trending Now Migration + Disk Cache + Quota Tracking ✅

### Objective

Switch the SerpAPI client from `engine=google_trends` (daily trends) to `engine=google_trends_trending_now` (real-time trending), add a persistent disk cache with quota tracking, add "already covered" detection in TrendFinder, and update cron jobs.

### Files Changed

| Action   | File                                             | Description                                            |
| -------- | ------------------------------------------------ | ------------------------------------------------------ |
| CREATE   | `backend/src/lib/cache.ts`                       | Persistent JSON DiskCache + quota tracker singleton    |
| REWRITE  | `backend/src/lib/SerpAPI.ts`                     | Add TrendingNow, use DiskCache, quota guard in _fetch  |
| UPDATE   | `backend/src/services/TrendFinder.ts`             | Use getTrendingNow + isAlreadyCovered + scoreTrendingNow |
| UPDATE   | `cron/trendMonitor.ts`                            | Reduce geos to 2, add quota check before execution     |
| UPDATE   | `.gitignore`                                      | Add `backend/data/`                                    |
| DELETE   | `frontend/.next/`                                 | Build artifacts                                        |

### Verification

- [x] `backend/src/lib/cache.ts` — Created with DiskCache, quota tracking, auto-save
- [x] `backend/src/lib/SerpAPI.ts` — Rewritten with TrendingNow, DiskCache, quota guard
- [x] `backend/src/services/TrendFinder.ts` — Uses getTrendingNow + isAlreadyCovered + scoreTrendingNow
- [x] `cron/trendMonitor.ts` — Geos reduced to ['us','gb'], quota check before execution
- [x] `.gitignore` — backend/data/ added
- [x] `frontend/.next/` — Deleted

### Details

**cache.ts** — Singleton DiskCache stored at `backend/data/cache.json`. In-memory copy with sync writes. Methods: get, set, getDailyUsage, getMonthlyUsage, incrementUsage, canMakeRequest (default maxDaily=8, maxMonthly=240), getCacheStats. Auto-save on process exit/SIGINT/SIGTERM.

**SerpAPI.ts** — Remove in-memory Map cache, import DiskCache. Add `TrendingNowResult` type, `parseIncrease()` helper, `getTrendingNow(geo?)` (engine=google_trends_trending_now, hours=4, only_active=true, volume>=500 filter), `scoreTrendingNow(trend)` scoring. Quota check in `_fetch()` via `cache.canMakeRequest()`, increment usage on success.

**TrendFinder.ts** — Add `isAlreadyCovered(query)` checking last 14 days articles for word overlap. `discover()` calls `getTrendingNow()` instead of `getTrendingSearches()`, uses `scoreTrendingNow()` for scoring, checks coverage before saving.

**trendMonitor.ts** — DEFAULT_GEOS: `['us', 'gb']`. Early return if `!cache.canMakeRequest()`.

---

Completed: 2026-06-21 — All 6 files verified in source.

## Progress

### Phase 0: Root Monorepo ✅

- [x] `package.json` — Root workspace scripts and devDependencies
- [x] `pnpm-workspace.yaml` — Workspace packages
- [x] `tsconfig.json` — Base TypeScript config
- [x] `.gitignore` — Ignore rules
- [x] `.env.example` — 35+ env vars
- [x] `.prettierrc` — Formatting config
- [x] `.eslintrc.cjs` — Linting config
- [x] `README.md` — Root readme

### Phase 1: Frontend Foundation ✅

- [x] `frontend/package.json` — Next.js + deps
- [x] `frontend/tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- [x] `frontend/app/globals.css`, `layout.tsx`, `not-found.tsx`
- [x] UI primitives: Button, Card, Badge, Pagination
- [x] Layout components: Header, Footer, Sidebar, SearchBar
- [x] SEO components: JsonLd, MetaTags, Breadcrumbs
- [x] Static pages: About, Contact, Privacy, Terms, Disclaimer

### Phase 2: Frontend Pages ✅

- [x] `frontend/app/page.tsx` — Homepage with hero, grid, trending
- [x] `frontend/app/article/[slug]/page.tsx` + `loading.tsx` — Article detail with SSR + ISR
- [x] `frontend/app/category/sports/page.tsx` + `entertainment/page.tsx`
- [x] `frontend/app/tag/[tag]/page.tsx`
- [x] `frontend/app/sitemap.ts`, `robots.ts`, `manifest.ts`
- [x] Article components: ArticleCard, ArticleBody, TableOfContents, FAQSection, RelatedArticles, ShareButtons

### Phase 3: Frontend API Client ✅

- [x] `frontend/lib/constants.ts`
- [x] `frontend/lib/formatters.ts`
- [x] `frontend/lib/api-client.ts` (with mock data switch)
- [x] `frontend/lib/admin-api.ts`

### Phase 4: Backend Foundation ✅

- [x] `backend/package.json`, `tsconfig.json`, `vitest.config.ts`
- [x] `backend/src/config/index.ts` — Config loader
- [x] `backend/src/middleware/errorHandler.ts` — AppError class + global error handler (E001/E010-12/E999)
- [x] `backend/src/middleware/rateLimiter.ts` — IP-based rate limiting, in-memory Map, Retry-After header
- [x] `backend/src/middleware/auth.ts` + `adminAuth.ts` — Token auth + session-based admin auth (uuid, 24h TTL)
- [x] `backend/src/middleware/validator.ts` — Zod schema validation (body/query/params)
- [x] `backend/src/middleware/cache.ts` — In-memory response cache with TTL, max 500 entries, prefix invalidation
- [x] `backend/src/index.ts` — Express app bootstrap + GET /api/health endpoint

### Phase 5: Database ✅

- [x] `backend/prisma/schema.prisma` — 10 models (SQLite, autoincrement IDs)
- [x] `backend/prisma/seed.ts` — Idempotent seed (2 categories, 750 keywords via head terms × modifiers)
- [ ] Initial migration (run when dependencies are installed)

### Phase 6: API Clients ✅

- [x] `backend/src/lib/SerpAPI.ts`
- [x] `backend/src/lib/GroqAPI.ts`

### Phase 6 Implementation Plan

**Strategy:** Deploy 3 parallel agents, one per API client file. All files go under `backend/src/lib/`. No additional npm dependencies needed — use Node.js 22 native `fetch` for HTTP calls.

**Pattern to follow (from existing code):**

- ESM with `.js` extensions in imports (type: "module")
- Path alias `@/` for project imports (e.g. `@/config/index.js`, `@/middleware/errorHandler.js`)
- `AppError` from `@/middleware/errorHandler.js` for typed errors (E001-E005 codes)
- `config` from `@/config/index.js` for env vars
- Class-based API wrappers with typed methods and interfaces

---

#### File 1: `backend/src/lib/SerpAPI.ts`

**Purpose:** Wrapper around SerpAPI REST API (https://serpapi.com) for search data, trends, news, keywords, and related queries.

**Methods:**

- `getTrendingSearches(geo?: string, hl?: string)` — Fetch trending search topics
- `search(query: string, params?: SearchParams)` — General search with location/device params
- `getNewsResults(query: string, params?: NewsParams)` — News results for a query
- `getRelatedQueries(query: string)` — Related searches / PAA
- `getKeywordData(query: string)` — Keyword volume, difficulty, CPC
- `getAnswerBox(query: string)` — Featured snippet / answer box
- `getRelatedSearches(query: string)` — Bottom-of-page related searches

**Typed interfaces:**

- `SerpAPIParams` — engine, q, api_key, location, hl, gl, device, num
- `TrendingSearchResult` — title, queries[], category, geo
- `NewsResult` — title, link, snippet, source, date, thumbnail
- `KeywordData` — keyword, searchVolume, competition, cpc, difficulty

**Error handling:**

- E001 (rate limit) — detect 429 response, log, throw AppError
- E002 (empty results) — detect empty data, log, throw AppError
- Network/timeout errors → rethrow as AppError with E002

**Caching:**

- In-memory Map<string, { data, timestamp }>
- TTL: 1h for news, 24h for keyword data, 7d for trends/SERP
- Max 1000 entries, LRU eviction
- Export `clearCache()` helper

**Rate limiting:**

- SerpAPI allows 100 queries/month on free tier
- Track count in-memory, warn at 90
- Exponential backoff retry: 3 attempts with 2s/5s/10s delays

---

#### File 2: `backend/src/lib/GroqAPI.ts`

**Purpose:** Wrapper around Groq API for AI article generation using Llama 4 70B with JSON mode.

**Methods:**

- `generateArticle(contentGuide: ContentGuide, options?: GenerateOptions)` — Generate article from structured guide
- `validateOutput(json: unknown)` — Validate generated JSON structure
- `fixMalformedJson(raw: string)` — Attempt to repair broken JSON
- `healthCheck()` — Ping Groq API to verify connectivity

**Typed interfaces:**

- `ContentGuide` — keyword, audience, subheadings, narrativeAngle, dataPoints[], structure
- `GenerateOptions` — model, temperature, maxTokens, topP
- `GeneratedArticle` — title, h1, metaDescription, contentBlocks[], faqItems[]

**Configuration (from config):**

- Model: `llama-4-70b` (primary), `mixtral-8x7b` (fallback)
- Temperature: 0.3, max_tokens: 4096, top_p: 0.9
- `response_format: { type: "json_object" }`

**Prompt engineering:**

- System prompt: "You are a sports/entertainment journalist. Generate articles in valid JSON following the specified structure..."
- User prompt: Assembled from ContentGuide fields — keyword, narrative angle, data points, audience, subheadings
- Enforce: 800+ words, 3+ sections, original analysis (no summaries), 2+ data points

**Error handling:**

- E003 (timeout) — 60s timeout for generation
- E004 (malformed JSON) — Attempt fixMalformedJson, if still broken throw AppError
- 3 retry attempts with 5s delay
- Fallback to mixtral-8x7b if llama-4-70b fails

**Cost tracking:**

- Track total tokens used in-memory
- Track per-call tokens (input + output)

---

#### File 3: `backend/src/lib/GoogleIndexingAPI.ts`

**Purpose:** Wrapper around Google Indexing API for notifying Google of new/updated content.

**Methods:**

- `notify(url: string, type: 'URL_UPDATED' | 'URL_DELETED')` — Send URL notification to Google
- `getStatus(url: string)` — Check current indexing status
- `notifyBatch(urls: Array<{ url: string; type: string }>)` — Batch notify multiple URLs

**Authentication:**

- OAuth 2.0 service account with JWT client assertion
- GoogleServiceAccountEmail + GooglePrivateKey from config
- Token caching: store access token in-memory, refresh on expiry
- Scope: `https://www.googleapis.com/auth/indexing`

**Implementation approach:**

- Use native `crypto` for JWT signing (RS256)
- No external `googleapis` library needed — keep dependencies minimal
- Build JWT assertion manually: header { alg: RS256, typ: JWT }, claim { iss, scope, aud, exp, iat }
- Exchange JWT for access token via Google OAuth2 token endpoint
- Use access token for Indexing API calls

**Error handling:**

- Token refresh failure → throw AppError
- API 4xx/5xx → log, throw AppError with appropriate code
- Graceful fallback — if disabled (googleIndexingEnabled = false), skip silently
- Batch: track successes/failures per URL

---

### Verification

After all 3 files are created:

1. Run `pnpm --filter backend typecheck` to verify TypeScript compiles
2. Run `pnpm --filter backend test` if tests exist (Phase 15)
3. Verify imports match existing patterns (@/ alias, .js extensions)

- [x] `backend/src/lib/GoogleIndexingAPI.ts`

### Phase 7: Core Services ✅

- [x] TrendFinder
- [x] KeywordMatrix
- [x] ContentGuide
- [x] GroqWriter
- [x] ArticleBuilder
- [x] SEOOptimizer
- [x] SchemaBuilder
- [x] Publisher

### Phase 8: SEO & Support Services ✅

- [x] TitleEngine (already existed)
- [x] MetaBuilder
- [x] SitemapManager
- [x] RSSFeed
- [x] LinkManager
- [x] ImageHandler
- [x] ContentRefresher
- [x] Notification
- [x] MetricsCollector
- [x] SERPTracker
- [x] TextAnalyzer
- [x] Typecheck passes (exit 0, zero errors)

### Phase 9: Admin Services ✅

- [x] AdminService
- [x] CategoryService
- [x] LinkService
- [x] AnalyticsService

### Phase 10: Public Routes ✅

- [x] `backend/src/lib/prisma.ts` — Central PrismaClient singleton
- [x] `backend/src/routes/health.ts`
- [x] `backend/src/routes/trends.ts`
- [x] `backend/src/routes/keywords.ts`
- [x] `backend/src/routes/articles.ts`
- [x] `backend/src/routes/sitemap.ts`
- [x] `backend/src/routes/rss.ts`
- [x] `backend/src/routes/generate.ts`
- [x] `backend/src/routes/webhook.ts`
- [x] `backend/src/routes/track.ts`
- [x] `backend/src/index.ts` — Register all route modules, remove inline health

### Phase 11: Admin Routes ✅

- [x] `backend/src/routes/admin/auth.ts`
- [x] `backend/src/routes/admin/stats.ts`
- [x] `backend/src/routes/admin/articles.ts`
- [x] `backend/src/routes/admin/categories.ts`
- [x] `backend/src/routes/admin/analytics.ts`
- [x] `backend/src/routes/admin/links.ts`
- [x] `backend/src/index.ts` — Registered 6 admin route modules

### Phase 12: Connect Frontend to Backend ✅

**Strategy:**

1. Extend backend with missing frontend display fields (imageUrl, excerpt, author, featured, tags)
2. Rewrite api-client.ts with proper response transformation (snake_case→camelCase, synthetic display fields)
3. Wire up all frontend pages to fetch from backend instead of hardcoded data

**Backend changes:**

- [x] Add `imageUrl`, `excerpt`, `author`, `featured`, `tags` to Article Prisma model
- [x] Run Prisma migration
- [x] Update articles route responses to include new fields
- [x] Add tag filtering support to GET /api/articles

**Frontend changes:**

- [x] Rewrite `api-client.ts` — new types matching backend, response transformation, synthetic display fields (category fallback images, readTime from wordCount, GameDayWire Staff author), mock data fallback kept
- [x] Wire up homepage (`page.tsx`) — fetch articles grid + trends from API
- [x] Wire up article detail (`article/[slug]/page.tsx`) — fetch from API, generate headings from content_blocks
- [x] Wire up category pages (`category/sports/page.tsx`, `category/entertainment/page.tsx`) — fetch filtered articles
- [x] Wire up tag page (`tag/[tag]/page.tsx`) — fetch filtered articles
- [x] End-to-end verification — `pnpm dev`, typecheck, visual check

### Phase 13: Admin Frontend ✅

- [x] `frontend/lib/auth-context.tsx`
- [x] Admin pages: login, dashboard, articles list, article editor, categories, analytics
- [x] Admin components: AdminSidebar, StatsCard, ArticleTable, ArticleEditor, LinkManager, CategoryForm, CategoryTable, AnalyticsChart

### Phase 14: Cron Jobs ✅

- [x] 9 cron job scripts + scheduler

### Phase 15: Tests ⬜

- [ ] Backend service unit tests
- [ ] Backend route integration tests
- [ ] Frontend component tests
- [ ] E2E tests

### Phase 16: Docker + Deployment ⬜

- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] .dockerignore
