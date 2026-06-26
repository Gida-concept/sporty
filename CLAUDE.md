# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GameDayWire is a **programmatic SEO blog engine** that autonomously generates sports and entertainment articles. It discovers trending topics, validates them via SerpAPI, generates AI-written content through a structured Content Guide Engine, optimizes it for SEO, and publishes to a Next.js frontend — all without human intervention.

**This is a greenfield project.** The full architecture is specified in `docs/` but no source code has been written yet. The documentation is the source of truth for all design decisions.

**Stack:** Next.js 15 (App Router) + Tailwind CSS → Express.js + Prisma ORM + PostgreSQL (Supabase) → SerpAPI + Groq API

## Build & Development Commands

```bash
# Install all dependencies (frontend + backend + cron)
pnpm install

# Start dev servers (frontend :3000 + backend :3001)
pnpm dev

# Type-check all packages
pnpm typecheck

# Run all backend tests (Vitest)
pnpm test

# Run backend tests with coverage
pnpm test -- --coverage

# Run frontend e2e tests (Playwright)
pnpm test:e2e

# Lint
pnpm lint

# Production build (frontend + backend)
pnpm build

# Start production servers
pnpm start

# Run single test file
npx vitest run backend/tests/services/TrendFinder.test.ts

# Format code
pnpm format

# Database migration (after schema changes)
npx prisma migrate dev --name description_of_change

# Seed initial data
pnpm seed

# Prisma Studio (database GUI)
npx prisma studio

# Cron dry-run (test without side effects)
pnpm cron:dry-run trendMonitor
```

## Architecture

### Monorepo Layout (pnpm workspaces)

```
sporty/
├── frontend/          # Next.js 15 App Router + Tailwind CSS
│   ├── app/           # Pages, layouts, API route proxies
│   ├── components/    # React components (article/, seo/, ui/, layout/, admin/)
│   └── lib/           # API client, formatters, auth context, constants
├── backend/           # Express.js REST API
│   ├── src/
│   │   ├── routes/    # 21 route handlers (8 public + 13 admin)
│   │   ├── services/  # 23 business logic services
│   │   ├── middleware/ # Auth, rate limiting, error handling, validation, cache
│   │   ├── lib/       # External API clients (SerpAPI, Groq)
│   │   └── config/    # Environment config loader
│   ├── prisma/        # Schema (9 models), migrations, seed
│   └── tests/         # Vitest unit + integration tests
├── cron/              # 9 node-cron scheduled tasks
├── scripts/           # Seed, cleanup utilities
└── docs/              # 14 documentation files (architecture source of truth)
```

### Data Flow

```
SerpAPI (Search Data) → Express Backend (Services) → PostgreSQL (via Prisma/Supabase)
                                ↓
                          Groq API (AI Writer)
                                ↓
                      Content Guide (Structured Instructions)
                                ↓
    Published Articles → Next.js (SSR/ISR) → Cloudflare CDN → Visitor
```

### 7-Stage Content Pipeline

1. **Trend Discovery** — SerpAPI trend mining → scoring algorithm → top 2 daily picks
2. **Keyword Selection** — Head term → modifiers → SerpAPI validation → priority scoring
3. **Content Guide Creation** — SERP analysis → data points → narrative angle → structure blueprint
4. **AI Content Generation** — Groq with structured prompt → JSON-validated output → quality gates
5. **SEO Optimization** — Title formula engine → meta generation → schema markup → heading validation
6. **Intelligent Linking** — TF-IDF similarity matching → tier 1/2 source citations → link graph
7. **Publishing** — Sitemap update → RSS feed → cache invalidation

### Key Architectural Principles

- **No AI Slop** — Content Guide Engine forces original analysis, not article summaries. Every article requires 3+ specific data points from SerpAPI news results.
- **Single API Source** — SerpAPI handles all search data (trends, SERP, news, keywords, PAA). No other search providers.
- **PostgreSQL (Supabase)** — Prisma schema uses PostgreSQL provider; Supabase hosts the production database.
- **Quality Gates** — 7 hard-coded anti-slop rules block publishing of generic/banned content.
- **Multi-layer caching** — Cloudflare CDN → Next.js ISR → Express in-memory → PostgreSQL query cache.

### Database (9 Prisma Models)

- `Trend` — Trending search queries from SerpAPI
- `Keyword` — Living keyword matrix (head terms × modifiers)
- `Article` — Primary content table with JSON link arrays
- `SeoMetric` — SEO performance tracking
- `LinkGraph` — Internal/external link source of truth
- `ContentGuide` — Archived content guides for audit trail
- `SystemLog` — Centralized event logging
- `Category` — Proper model with unique slug (many-to-many via ArticleCategory)
- `PageView` — Daily-aggregated analytics [(articleId, date) unique]

### External API Clients

- **SerpAPI** (`backend/src/lib/SerpAPI.ts`) — Trends, SERP analysis, keyword validation, news, PAA, related searches
- **Groq API** (`backend/src/lib/GroqAPI.ts`) — Llama 4 70B (primary), Mixtral 8x7B (fallback), temp 0.3, max 4096 tokens, JSON mode
### Cron Jobs (9 scheduled tasks)

| Job               | Schedule (UTC)      | Purpose                                                 |
| ----------------- | ------------------- | ------------------------------------------------------- |
| morning_article   | Daily 08:00         | Full article generation pipeline                        |
| evening_article   | Daily 19:00         | Full article generation pipeline (alternating category) |
| trend_monitor     | Every 3 hours       | Discover and score trending topics                      |
| keyword_refresh   | Daily 02:00         | Regenerate keyword matrix                               |
| content_refresh   | Daily 03:00         | Identify stale articles needing refresh                 |
| sitemap_generator | Daily 01:00         | Rebuild XML sitemap                                     |
| link_update       | Weekly Sunday 04:00 | Rebuild internal link graph                             |
| seo_audit         | Weekly Sunday 05:00 | Technical SEO audit                                     |
| backup            | Weekly Sunday 06:00 | Database dump and file backup                           |

## Documentation

The `docs/` directory is the authoritative source for all architecture and design decisions. Read relevant docs before implementing any feature.

| Document                          | When to Read                                                 |
| --------------------------------- | ------------------------------------------------------------ |
| `docs/README.md`                  | Start here — project overview, glossary, tech stack          |
| `docs/guides/architecture.md`     | System design, caching, scaling, admin architecture          |
| `docs/guides/content-pipeline.md` | 7-stage pipeline, Content Guide, optimization checklist      |
| `docs/guides/seo-strategy.md`     | Title formulas, schema, linking, monetization                |
| `docs/guides/content-quality.md`  | Anti-slop rules, banned phrases, readability gate            |
| `docs/project-structure.md`       | Full file/directory layout with purposes                     |
| `docs/getting-started.md`         | Dev setup, API keys, verification checklist                  |
| `docs/api-reference.md`           | All 21 endpoints with request/response schemas               |
| `docs/database.md`                | Complete Prisma schema, indexes, migrations                  |
| `docs/cron-jobs.md`               | All 9 cron jobs, schedules, exit codes, dry-run testing      |
| `docs/admin.md`                   | Admin section: dashboard, auth, analytics, links, categories |
| `docs/deployment.md`              | VPS/Docker deploy, env reference, security checklist         |
| `docs/monitoring.md`              | Health checks, alerts, success metrics                       |
| `docs/troubleshooting.md`         | Issue resolution by category                                 |
| `docs/seo-checklist.md`           | ~150 item SEO verification checklist                         |

## Implementation Order (from docs)

The project is greenfield. Build in this order:

1. **Backend foundation** — Express app bootstrap, config loader, middleware stack (auth, rate limiting, error handler, cache)
2. **Database** — Prisma schema, migrations, seed script
3. **External API clients** — SerpAPI, GroqAPI wrappers
4. **Core services** — TrendFinder → KeywordMatrix → ContentGuide → GroqWriter → ArticleBuilder
5. **SEO services** — SEOOptimizer, TitleEngine, MetaBuilder, SchemaBuilder, SitemapManager, RSSFeed
6. **Linking & publishing** — LinkManager, Publisher, ImageHandler
7. **Cron jobs** — All 9 scheduled tasks
8. **API routes** — 8 public endpoints + 13 admin endpoints
9. **Frontend** — Next.js App Router pages, components, lib
10. **Admin UI** — Admin route group, components
11. **Testing** — Vitest unit/integration, Playwright e2e
12. **Deployment** — Docker Compose, PM2 config, Cloudflare setup
