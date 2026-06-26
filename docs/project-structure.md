# Project Structure — GameDayWire

Complete monorepo layout for the GameDayWire programmatic SEO blog system. This document describes every directory, file, and its purpose in the new Next.js + Express + Prisma stack.

---

## Directory Tree

```
sportytainment/
│
├── frontend/                          # Next.js 15 App Router
│   ├── app/                           # Pages and route handlers
│   │   ├── page.tsx                   # Homepage: latest articles, trending topics
│   │   ├── layout.tsx                 # Root layout with SEO meta, fonts, providers
│   │   ├── article/
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Article detail page (SSR + ISR)
│   │   ├── category/
│   │   │   ├── sports/
│   │   │   │   └── page.tsx          # Sports category archive page
│   │   │   └── entertainment/
│   │   │       └── page.tsx          # Entertainment category archive page
│   │   ├── tag/
│   │   │   └── [tag]/
│   │   │       └── page.tsx          # Tag archive page
│   │   ├── page/
│   │   │   ├── about/page.tsx        # About page with E-E-A-T signals
│   │   │   ├── contact/page.tsx      # Contact page with form
│   │   │   ├── privacy-policy/page.tsx  # Privacy Policy (AdSense requirement)
│   │   │   ├── terms/page.tsx        # Terms of Service (AdSense requirement)
│   │   │   └── disclaimer/page.tsx   # Affiliate and AI content disclosure
│   │   ├── sitemap.ts                # Dynamic XML sitemap generation (Next.js built-in)
│   │   ├── robots.ts                 # Dynamic robots.txt generation
│   │   ├── manifest.ts               # PWA manifest
│   │   └── api/                      # API route handlers (proxy to Express backend)
│   │       └── articles/
│   │           └── route.ts          # Example: /api/articles proxy route
│   │   │
│   │   ├── admin/                    # Admin route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Admin login page
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── layout.tsx            # Admin layout with auth guard and sidebar
│   │   │   ├── articles/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Article detail/edit + analytics
│   │   │   ├── categories/
│   │   │   │   └── page.tsx          # Category CRUD management
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx          # Analytics dashboard
│   │   │   └── settings/
│   │   │       └── page.tsx          # Site settings (ad codes, HTML)
│   │   │   └── links/
│   │   │       └── page.tsx          # Link management interface
│   │   │
│   │   ├── components/               # React components
│   │   ├── ui/                       # Shared UI primitives
│   │   │   ├── AdSlot.tsx             # Ad code container with customHtml support
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Pagination.tsx
│   │   ├── article/                  # Article-specific components
│   │   │   ├── ArticleCard.tsx       # Article card for listings
│   │   │   ├── ArticleBody.tsx       # Content block renderer
│   │   │   ├── TableOfContents.tsx   # Auto-generated TOC
│   │   │   ├── FAQSection.tsx        # FAQ renderer with schema
│   │   │   ├── RelatedArticles.tsx   # Related article suggestions
│   │   │   └── ShareButtons.tsx      # Social sharing
│   │   ├── seo/                      # SEO components
│   │   │   ├── JsonLd.tsx            # JSON-LD schema injection
│   │   │   ├── MetaTags.tsx          # OG / Twitter card meta
│   │   │   └── Breadcrumbs.tsx       # Breadcrumb navigation
│   │   └── layout/                   # Layout components
│   │       ├── LayoutShell.tsx       # Root layout wrapper (conditional public chrome)
│   │       ├── Header.tsx            # Site header / navigation
│   │       ├── Footer.tsx            # Site footer
│   │       ├── Sidebar.tsx           # Sidebar with trending / related + ad slots
│   │       └── SearchBar.tsx         # Search component
│   │   ├── admin/                    # Admin-specific components
│   │       ├── AdminLayout.tsx       # Admin layout shell with sidebar + header
│   │       ├── AdminSidebar.tsx      # Admin navigation sidebar
│   │       ├── StatsCard.tsx         # Dashboard stat display card
│   │       ├── ArticleTable.tsx      # Paginated article list table
│   │       ├── ArticleEditor.tsx     # Article detail/metadata editor
│   │       ├── LinkManager.tsx       # Per-article link add/remove UI
│   │       ├── CategoryForm.tsx      # Category create/edit form
│   │       ├── CategoryTable.tsx     # Category list with CRUD actions
│   │       └── AnalyticsChart.tsx    # Time-series analytics chart
│   │
│   ├── lib/                          # Client utilities
│   │   ├── api-client.ts             # Typed fetch wrapper for backend API
│   │   ├── formatters.ts             # Date, number, text formatting
│   │   ├── constants.ts              # Site-wide constants
│   │   ├── admin-api.ts              # Admin API client (authenticated calls)
│   │   └── auth-context.tsx          # React context for admin auth state
│   │
│   ├── public/                       # Static assets
│   │   ├── images/                   # Images, logo, OG default, favicon
│   │   │   ├── logo.svg
│   │   │   ├── og-default.jpg
│   │   │   ├── favicon.ico
│   │   │   └── featured/             # Article featured images (auto-generated)
│   │   ├── fonts/                    # Self-hosted web fonts (WOFF2)
│   │   └── manifest.json             # PWA manifest
│   │
│   ├── tailwind.config.ts            # Tailwind CSS configuration
│   ├── next.config.ts                # Next.js configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── vitest.config.ts              # Vitest configuration (frontend)
│   └── package.json                  # Frontend dependencies
│
├── backend/                          # Express.js API server
│   ├── src/
│   │   ├── index.ts                  # Express app bootstrap, middleware, routes
│   │   │
│   │   ├── routes/                   # Express route handlers
│   │   │   ├── trends.ts             # GET /api/trends
│   │   │   ├── keywords.ts           # GET /api/keywords
│   │   │   ├── articles.ts           # GET /api/articles
│   │   │   ├── sitemap.ts            # GET /api/sitemap
│   │   │   ├── rss.ts                # GET /api/rss
│   │   │   ├── health.ts             # GET /api/health
│   │   │   ├── generate.ts           # POST /api/generate
│   │   │   ├── webhook.ts            # POST /api/webhook
│   │   │   ├── settings.ts           # GET /api/settings — public site settings
│   │   │   ├── track.ts              # GET /api/track — lightweight page view recording
│   │   │   └── admin/                # Admin route handlers
│   │   │       ├── auth.ts           # POST /api/admin/auth/login
│   │   │       ├── stats.ts          # GET /api/admin/stats
│   │   │       ├── articles.ts       # GET/PATCH/DELETE /api/admin/articles
│   │   │       ├── categories.ts     # CRUD /api/admin/categories
│   │   │       ├── analytics.ts      # GET /api/admin/analytics
│   │   │       ├── settings.ts       # GET/PUT /api/admin/settings — site configuration
│   │   │       ├── links.ts          # POST/DELETE /api/admin/articles/:id/links
│   │   │       └── track.ts          # GET /api/track
│   │   │
│   │   ├── services/                 # Business logic (core differentiator)
│   │   │   ├── TrendFinder.ts        # Trend discovery, scoring, ranking
│   │   │   ├── KeywordMatrix.ts      # Living keyword matrix generation and validation
│   │   │   ├── ContentGuide.ts       # Content guide assembly from SerpAPI data
│   │   │   ├── GroqWriter.ts         # AI content generation orchestration
│   │   │   ├── ArticleBuilder.ts     # Article assembly from content blocks
│   │   │   ├── ContentRefresher.ts   # Article update detection and execution
│   │   │   ├── SEOOptimizer.ts       # Rank Math SEO orchestration
│   │   │   ├── TitleEngine.ts        # Title formula and scoring
│   │   │   ├── MetaBuilder.ts        # Meta tag generation
│   │   │   ├── SchemaBuilder.ts      # JSON-LD structured data generation
│   │   │   ├── SitemapManager.ts     # XML sitemap generation and submission
│   │   │   ├── RSSFeed.ts            # RSS 2.0 feed generation
│   │   │   ├── LinkManager.ts        # Internal/external link management
│   │   │   ├── Publisher.ts          # End-to-end publishing orchestration
│   │   │   ├── ImageHandler.ts       # Image processing and WebP conversion
│   │   │   ├── Notification.ts       # Email and webhook alert system
│   │   │   ├── MetricsCollector.ts   # Traffic and engagement tracking
│   │   │   ├── SERPTracker.ts        # SERP position tracking via SerpAPI
│   │   │   ├── TextAnalyzer.ts       # Readability, sentiment, keyword density
│   │   │   ├── AdminService.ts       # Dashboard stats, article admin operations
│   │   │   ├── CategoryService.ts    # Category CRUD operations and reassignment
│   │   │   ├── LinkService.ts        # Article-level link management and sync
│   │   │   ├── AnalyticsService.ts   # PageView tracking, aggregation queries
│   │   │   └── SiteSettingsService.ts # Key-value site settings store
│   │   │
│   │   ├── middleware/               # Express middleware
│   │   │   ├── auth.ts               # Token-based authentication
│   │   │   ├── adminAuth.ts          # Shared-secret admin bearer token verification
│   │   │   ├── rateLimiter.ts        # IP-based rate limiting
│   │   │   ├── errorHandler.ts       # Global error handling
│   │   │   ├── validator.ts          # Request validation
│   │   │   └── cache.ts              # In-memory response caching
│   │   │
│   │   ├── lib/                      # External API clients
│   │   │   ├── SerpAPI.ts            # SerpAPI client wrapper
│   │   │   └── GroqAPI.ts            # Groq API client wrapper
│   │   │
│   │   └── config/                   # Configuration
│   │       └── index.ts              # Environment config loader
│   │
│   ├── prisma/                       # Prisma ORM
│   │   ├── schema.prisma             # Database schema (10 models, incl. SiteSetting)
│   │   ├── migrations/               # Migration history
│   │   └── seed.ts                   # Initial data seeding
│   │
│   ├── tests/                        # Backend tests (Vitest)
│   │   ├── services/                 # Service unit tests
│   │   ├── routes/                   # Route integration tests
│   │   └── fixtures/                 # Test data and mocks
│   │
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── package.json
│
├── cron/                             # node-cron scheduled task definitions
│   ├── morningArticle.ts             # Daily 08:00 UTC — generate and publish morning article
│   ├── eveningArticle.ts             # Daily 19:00 UTC — generate and publish evening article
│   ├── trendMonitor.ts               # Every 3 hours — discover and score trending topics
│   ├── keywordRefresh.ts             # Daily 02:00 UTC — regenerate keyword matrix
│   ├── contentRefresh.ts             # Daily 03:00 UTC — identify stale articles for update
│   ├── linkUpdate.ts                 # Weekly Sunday 04:00 UTC — rebuild internal link graph
│   ├── seoAudit.ts                   # Weekly Sunday 05:00 UTC — technical SEO health check
│   ├── sitemapGenerator.ts           # Daily 01:00 UTC — rebuild XML sitemap
│   └── backup.ts                     # Weekly Sunday 06:00 UTC — database and file backup
│
├── docs/                             # Documentation
│   ├── README.md                     # Documentation hub (this index)
│   ├── project-structure.md          # This file — monorepo layout
│   ├── getting-started.md            # From zero to running
│   ├── api-reference.md              # API endpoint reference
│   ├── database.md                   # Prisma schema documentation
│   ├── cron-jobs.md                  # Cron job reference
│   ├── deployment.md                 # Production deployment
│   ├── monitoring.md                 # Health checks and alerting
│   ├── troubleshooting.md            # Issue resolution guide
│   ├── seo-checklist.md              # SEO verification checklist
│   └── guides/                       # Business logic documentation
│       ├── architecture.md           # System design
│       ├── content-pipeline.md       # 7-stage pipeline
│       ├── seo-strategy.md           # SEO strategy
│       └── content-quality.md        # Quality safeguards
│
├── scripts/                          # Utility scripts
│   ├── seed.ts                       # Database seeding utility
│   └── cleanup.ts                    # Cache and log cleanup
│
├── docker-compose.yml                # Local dev containers (optional)
├── package.json                      # Root workspace config (npm workspace)
├── package-lock.json                 # npm lockfile
├── tsconfig.json                     # Root TypeScript config (base)
├── .env.example                      # Environment variable template
├── .gitignore                        # Git ignore rules
├── .eslintrc.cjs                     # ESLint configuration
├── .prettierrc                       # Prettier configuration
└── README.md                         # Root README
```

---

## Frontend (`frontend/`)

### Pages (`app/`)

| File                              | Purpose                                            | SEO Impact                  | Rendering                     |
| --------------------------------- | -------------------------------------------------- | --------------------------- | ----------------------------- |
| `page.tsx`                        | Homepage: featured articles, trending topics       | High — primary landing page | ISR (revalidate: 3600)        |
| `article/[slug]/page.tsx`         | Article detail                                     | Critical — content pages    | SSR + ISR (revalidate: 86400) |
| `category/sports/page.tsx`        | Sports category archive                            | Medium — topical authority  | ISR (revalidate: 7200)        |
| `category/entertainment/page.tsx` | Entertainment category archive                     | Medium — topical authority  | ISR (revalidate: 7200)        |
| `tag/[tag]/page.tsx`              | Tag-based content discovery                        | Low — long-tail capture     | SSG                           |
| `page/about/page.tsx`             | About page with E-E-A-T signals                    | Medium — trust signals      | SSG                           |
| `page/privacy-policy/page.tsx`    | Privacy policy (AdSense required)                  | Low — compliance            | SSG                           |
| `sitemap.ts`                      | Dynamic XML sitemap                                | Critical — indexation       | Generated at build time       |
| `robots.ts`                       | Crawler directives                                 | Critical — crawlability     | Dynamic                       |
| `admin/login/page.tsx`            | Admin login form                                   | None — auth-only            | Client                        |
| `admin/page.tsx`                  | Admin dashboard (article count, analytics summary) | None — auth-only            | Client                        |
| `admin/articles/[id]/page.tsx`    | Article detail/edit with per-post analytics        | None — auth-only            | Client                        |
| `admin/categories/page.tsx`       | Category CRUD management                           | None — auth-only            | Client                        |
| `admin/analytics/page.tsx`        | Time-series analytics dashboard                    | None — auth-only            | Client                        |
| `admin/settings/page.tsx`         | Site settings form (ad codes, HTML injections)     | None — auth-only            | Client                        |
| `admin/links/page.tsx`            | Link management interface                          | None — auth-only            | Client                        |

### Components (`components/`)

| Component                     | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `ui/AdSlot.tsx`               | Ad code container with customHtml support             |
| `ui/Button.tsx`               | Reusable button component                             |
| `ui/Card.tsx`                 | Generic card container                                |
| `ui/Badge.tsx`                | Category/status badge                                 |
| `ui/Pagination.tsx`           | Pagination for archive pages                          |
| `article/ArticleCard.tsx`     | Article preview card for listings                     |
| `article/ArticleBody.tsx`     | Renders content blocks (h2, p, ul, blockquote, table) |
| `article/TableOfContents.tsx` | Auto-generated table of contents                      |
| `article/FAQSection.tsx`      | FAQ accordion with JSON-LD schema                     |
| `article/RelatedArticles.tsx` | Related articles sidebar                              |
| `article/ShareButtons.tsx`    | Social sharing buttons                                |
| `seo/JsonLd.tsx`              | Injects JSON-LD structured data                       |
| `seo/MetaTags.tsx`            | Manages OG / Twitter card meta tags                   |
| `seo/Breadcrumbs.tsx`         | Breadcrumb navigation with schema                     |
| `layout/LayoutShell.tsx`      | Root layout wrapper (conditional public chrome)       |
| `layout/Header.tsx`           | Site header and main navigation                       |
| `layout/Footer.tsx`           | Site footer with links                                |
| `layout/Sidebar.tsx`          | Sidebar with trending/related content + ad slots      |
| `layout/SearchBar.tsx`        | Search input component                                |
| `admin/AdminLayout.tsx`       | Admin layout shell with sidebar + header              |
| `admin/AdminSidebar.tsx`      | Admin navigation sidebar                              |
| `admin/StatsCard.tsx`         | Dashboard stat display card                           |
| `admin/ArticleTable.tsx`      | Paginated article list table                          |
| `admin/ArticleEditor.tsx`     | Article detail/metadata editor                        |
| `admin/LinkManager.tsx`       | Per-article link add/remove UI                        |
| `admin/CategoryForm.tsx`      | Category create/edit form                             |
| `admin/CategoryTable.tsx`     | Category list with CRUD actions                       |
| `admin/AnalyticsChart.tsx`    | Time-series analytics chart                           |

---

## Backend (`backend/`)

### Routes (`src/routes/`)

| Route                                          | File                  | Purpose                        | Rate Limit |
| ---------------------------------------------- | --------------------- | ------------------------------ | ---------- |
| `GET /api/trends`                              | `trends.ts`           | Current trending topics JSON   | 100/hour   |
| `GET /api/keywords`                            | `keywords.ts`         | Keyword opportunities JSON     | 100/hour   |
| `GET /api/articles`                            | `articles.ts`         | Article list/search JSON       | 200/hour   |
| `GET /api/sitemap`                             | `sitemap.ts`          | Dynamic XML sitemap            | 50/hour    |
| `GET /api/rss`                                 | `rss.ts`              | RSS 2.0 feed                   | 100/hour   |
| `GET /api/health`                              | `health.ts`           | System health status           | 50/hour    |
| `POST /api/generate`                           | `generate.ts`         | Manual article generation      | 10/hour    |
| `POST /api/webhook`                            | `webhook.ts`          | External service callbacks     | 50/hour    |
| `GET /api/track`                               | `track.ts`            | Lightweight page view tracking | 500/hour   |
| `GET /api/settings`                            | `settings.ts`         | Public site settings           | 30/minute  |
| `POST /api/admin/auth/login`                   | `admin/auth.ts`       | Admin authentication           | 10/hour    |
| `GET /api/admin/stats`                         | `admin/stats.ts`      | Dashboard statistics           | 100/hour   |
| `GET /api/admin/articles`                      | `admin/articles.ts`   | Paginated article list         | 100/hour   |
| `GET /api/admin/articles/:id`                  | `admin/articles.ts`   | Single article detail          | 100/hour   |
| `PATCH /api/admin/articles/:id`                | `admin/articles.ts`   | Update article                 | 50/hour    |
| `DELETE /api/admin/articles/:id`               | `admin/articles.ts`   | Delete/archive article         | 20/hour    |
| `POST /api/admin/articles/:id/links`           | `admin/links.ts`      | Add link to article            | 50/hour    |
| `DELETE /api/admin/articles/:id/links/:linkId` | `admin/links.ts`      | Remove link from article       | 50/hour    |
| `GET /api/admin/categories`                    | `admin/categories.ts` | List categories                | 100/hour   |
| `POST /api/admin/categories`                   | `admin/categories.ts` | Create category                | 50/hour    |
| `PUT /api/admin/categories/:id`                | `admin/categories.ts` | Update category                | 50/hour    |
| `DELETE /api/admin/categories/:id`             | `admin/categories.ts` | Delete category                | 20/hour    |
| `GET /api/admin/analytics`                     | `admin/analytics.ts`  | Time-series analytics          | 50/hour    |
| `GET /api/admin/settings`                      | `admin/settings.ts`   | Get site settings              | 100/hour   |
| `PUT /api/admin/settings`                      | `admin/settings.ts`   | Update site settings           | 100/hour   |

### Services (`src/services/`) — Business Logic

| Service            | Responsibility                                        | Replaces (PHP)                   |
| ------------------ | ----------------------------------------------------- | -------------------------------- |
| `TrendFinder`      | Trend discovery, scoring, ranking                     | `App\Content\TrendFinder`        |
| `KeywordMatrix`    | Living keyword matrix generation and validation       | `App\Content\KeywordMatrix`      |
| `ContentGuide`     | Content guide assembly from SerpAPI data              | `App\Content\ContentGuide`       |
| `GroqWriter`       | AI content generation orchestration                   | `App\Content\GroqWriter`         |
| `ArticleBuilder`   | Article assembly from content blocks                  | `App\Content\ArticleBuilder`     |
| `ContentRefresher` | Article update detection and execution                | `App\Content\ContentRefresher`   |
| `SEOOptimizer`     | Rank Math SEO orchestration                           | `App\SEO\SEOOptimizer`           |
| `TitleEngine`      | Title formula and scoring                             | `App\SEO\TitleEngine`            |
| `MetaBuilder`      | Meta tag generation (title, description, OG, Twitter) | `App\SEO\MetaBuilder`            |
| `SchemaBuilder`    | JSON-LD structured data generation                    | `App\SEO\SchemaBuilder`          |
| `SitemapManager`   | XML sitemap generation and submission                 | `App\SEO\SitemapManager`         |
| `RSSFeed`          | RSS 2.0 feed generation                               | `App\SEO\RSSFeed`                |
| `LinkManager`      | Internal/external link management                     | `App\SEO\LinkManager`            |
| `Publisher`        | End-to-end publishing orchestration                   | `App\Publishing\Publisher`       |
| `ImageHandler`     | Image processing and WebP conversion                  | `App\Publishing\ImageHandler`    |
| `Notification`     | Email and webhook alert system                        | `App\Publishing\Notification`    |
| `MetricsCollector` | Traffic and engagement tracking                       | `App\Analytics\MetricsCollector` |
| `SERPTracker`      | SERP position tracking via SerpAPI                    | `App\Analytics\SERPTracker`      |
| `TextAnalyzer`     | Readability, sentiment, keyword density analysis      | `App\Utils\TextAnalyzer`         |
| `AdminService`     | Dashboard stats aggregation, article admin operations | New (no PHP equivalent)          |
| `CategoryService`  | Category CRUD operations and reassignment safety      | New (no PHP equivalent)          |
| `LinkService`      | Article-level link management and sync                | New (no PHP equivalent)          |
| `AnalyticsService` | PageView tracking, daily aggregation queries          | New (no PHP equivalent)          |
| `SiteSettingsService` | Key-value site settings store (ad codes, HTML)     | New (no PHP equivalent)          |

### External API Clients (`src/lib/`)

| Client                 | Service         | Purpose                                              |
| ---------------------- | --------------- | ---------------------------------------------------- |
| `SerpAPI.ts`           | SerpAPI         | Trends, SERP analysis, keyword validation, news, PAA |
| `GroqAPI.ts`           | Groq            | AI content generation via Llama 4 / Mixtral          |

### Middleware (`src/middleware/`)

| Middleware        | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `auth.ts`         | Token-based authentication for write endpoints              |
| `adminAuth.ts`    | Shared-secret bearer token verification for admin endpoints |
| `rateLimiter.ts`  | IP-based rate limiting per endpoint                         |
| `errorHandler.ts` | Global error handling and logging                           |
| `validator.ts`    | Request body/parameter validation                           |
| `cache.ts`        | In-memory response caching with TTL                         |

---

## Cron Jobs (`cron/`)

| File                  | Schedule (UTC)      | Purpose                                                 | Exit Codes                          |
| --------------------- | ------------------- | ------------------------------------------------------- | ----------------------------------- |
| `morningArticle.ts`   | Daily 08:00         | Full article generation pipeline (trend to publish)     | 0=success, 1=retry, 2=manual review |
| `eveningArticle.ts`   | Daily 19:00         | Full article generation pipeline (alternating category) | 0=success, 1=retry, 2=manual review |
| `trendMonitor.ts`     | Every 3 hours       | Discover and score trending topics via SerpAPI          | 0=success, 1=API error              |
| `keywordRefresh.ts`   | Daily 02:00         | Regenerate keyword matrix and validate with SerpAPI     | 0=success                           |
| `contentRefresh.ts`   | Daily 03:00         | Identify stale articles needing data refresh            | 0=success                           |
| `sitemapGenerator.ts` | Daily 01:00         | Rebuild XML sitemap index and article sitemaps          | 0=success                           |
| `linkUpdate.ts`       | Weekly Sunday 04:00 | Rebuild internal link graph across all articles         | 0=success                           |
| `seoAudit.ts`         | Weekly Sunday 05:00 | Technical SEO audit (links, schema, meta, duplicates)   | 0=success, 1=issues found           |
| `backup.ts`           | Weekly Sunday 06:00 | Database dump and file backup                           | 0=success, 1=backup failed          |

See [Cron Jobs](./cron-jobs.md) for complete documentation.

---

## Documentation (`docs/`)

| File                         | Purpose                                                          | Source                             |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `README.md`                  | Documentation hub, glossary, navigation                          | New (replaces old README)          |
| `project-structure.md`       | Monorepo layout with file purposes                               | New                                |
| `getting-started.md`         | Setup guide from zero to running                                 | From `setup.md`                    |
| `api-reference.md`           | Full API endpoint documentation                                  | From `api.md`                      |
| `database.md`                | Prisma schema documentation                                      | New                                |
| `cron-jobs.md`               | Scheduled task reference                                         | New                                |
| `deployment.md`              | Production deployment instructions                               | New                                |
| `monitoring.md`              | Health checks, alerts, maintenance                               | New                                |
| `troubleshooting.md`         | Issue resolution guide                                           | Rewrite of existing                |
| `seo-checklist.md`           | ~150 item SEO verification checklist                             | Rewrite of existing                |
| `guides/architecture.md`     | System design and philosophy                                     | From `architecture.md`             |
| `guides/content-pipeline.md` | 7-stage pipeline deep-dive                                       | New (from architecture.md content) |
| `guides/seo-strategy.md`     | Title formulas, schema, linking, monetization                    | New (from architecture.md content) |
| `guides/content-quality.md`  | Quality safeguards, banned phrases, readability                  | New                                |
| `admin.md`                   | Admin section reference: dashboard, analytics, links, categories | New                                |

---

## Key Files

| File                           | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `package.json` (root)          | npm workspace root — defines shared scripts and dev dependencies |
| `npm workspaces` (in root)     | Defines workspace packages: `frontend/`, `backend/`, `cron/`      |
| `tsconfig.json` (root)         | Base TypeScript config extended by all packages                   |
| `.env.example`                 | Template for environment variables (35+ variables)                |
| `docker-compose.yml`           | Optional Docker setup for local development                       |
| `frontend/next.config.ts`      | Next.js configuration (images, rewrites, headers, ISR)            |
| `frontend/tailwind.config.ts`  | Tailwind CSS theme, colors, typography                            |
| `backend/prisma/schema.prisma` | Database schema (10 models, incl. SiteSetting)                    |
| `backend/vitest.config.ts`     | Backend test configuration                                        |
