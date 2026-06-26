# GameDayWire — Your Daily Sports & Entertainment News Feed

> **Generate 2 original sports and entertainment articles daily, fully autonomously, using AI-powered search data analysis and content generation.**

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?logo=next.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-Proprietary-red)

GameDayWire is a fully automated, programmatic SEO blog engine that discovers trending sports and entertainment topics, validates them against real search data, generates original AI content through a structured **Content Guide Engine**, optimizes it for Rank Math SEO standards, and publishes to a Next.js frontend — all without human intervention. The system runs on **Next.js 15 (App Router)** with **Tailwind CSS** for the frontend and **Express.js + Prisma ORM + PostgreSQL (Supabase)** for the backend, using **SerpAPI** for search data and **Groq API (Llama 4 / Mixtral)** for AI content generation, fronted by **Cloudflare CDN**.

The core differentiator is the **Content Guide Engine**, which prevents generic "AI slop" by forcing the AI to write from structured SerpAPI data points, narrative angles, and template constraints rather than summarizing existing articles. Every article goes through a **7-stage pipeline**: Trend Discovery → Keyword Selection → Content Guide Creation → AI Content Generation → SEO Optimization → Intelligent Linking → Publishing. Each stage is handled by dedicated TypeScript services orchestrated by node-cron scheduled tasks.

Two articles are published daily — one at 08:00 UTC and one at 19:00 UTC — targeting 8 English-speaking markets (US, UK, Canada, Australia, Ireland, New Zealand, South Africa, India) with geo-aware content adjustments.

---

## Documentation

### Foundation Docs

| Document                                    | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| [Project Structure](./project-structure.md) | Full monorepo layout, directory purposes, service mappings |
| [Getting Started](./getting-started.md)     | From zero to running — install, configure, verify          |

### Business Logic / Guides

| Document                                         | Purpose                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [Architecture](./guides/architecture.md)         | System design, philosophy, data flow, scaling roadmap                  |
| [Content Pipeline](./guides/content-pipeline.md) | 7-stage pipeline deep-dive — trends through publishing                 |
| [SEO Strategy](./guides/seo-strategy.md)         | Title formulas, schema, intelligent linking, monetization              |
| [Content Quality](./guides/content-quality.md)   | Anti-slop rules, banned phrases, readability gate, duplicate detection |

### Technical Reference

| Document                            | Purpose                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| [API Reference](./api-reference.md) | All 23 endpoints (9 public + 14 admin), request/response schemas, error codes |
| [Database](./database.md)           | Prisma schema for all 9 models, indexes, migrations                           |
| [Cron Jobs](./cron-jobs.md)         | All 9 scheduled tasks, schedules, exit codes, dry-run testing                 |

### Administration

| Document                    | Purpose                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| [Admin Section](./admin.md) | Dashboard, article management, link management, category CRUD, analytics |

### Operations

| Document                                | Purpose                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- |
| [Deployment](./deployment.md)           | Production setup, Docker Compose, environment reference, security checklist |
| [Monitoring](./monitoring.md)           | Health checks, alerts, success metrics, maintenance schedule                |
| [Troubleshooting](./troubleshooting.md) | Issue resolution by category — install, runtime, DB, cache, cron, SEO       |
| [SEO Checklist](./seo-checklist.md)     | Comprehensive ~150 item verification checklist                              |

---

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Git

# 1. Clone the repository
git clone https://github.com/your-username/sportytainment.git
cd sportytainment

# 2. Install dependencies (workspace-wide)
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your SerpAPI, Groq, and other credentials

# 4. Run database migration
npx prisma migrate dev

# 5. Seed initial data
pnpm seed

# 6. Start development servers (frontend + backend concurrently)
pnpm dev

# 7. Verify setup
curl http://localhost:3000           # Next.js frontend
curl http://localhost:3001/api/health  # Express health endpoint
```

See [Getting Started](./getting-started.md) for the complete setup guide including API key configuration, verification checklist, and testing instructions.

---

## Tech Stack

| Layer           | Technology                                          | Purpose                                               |
| --------------- | --------------------------------------------------- | ----------------------------------------------------- |
| **Frontend**    | Next.js 15 (App Router) + Tailwind CSS + TypeScript | SSR pages, API client components, SEO meta rendering  |
| **Backend**     | Express.js + TypeScript + Prisma ORM                | REST API, business logic services, cron orchestration |
| **Database**    | PostgreSQL via Prisma ORM (Supabase)                  | Cloud-hosted relational database with connection pooling |
| **Search Data** | SerpAPI                                             | Trends, SERP analysis, keyword validation, news, PAA  |
| **AI Engine**   | Groq API (Llama 4 / Mixtral)                        | Content generation with structured prompts            |
| **Cache**       | Next.js ISR + Express in-memory + PostgreSQL        | Multi-layer caching strategy                          |
| **CDN**         | Cloudflare (free tier)                              | Global asset delivery, SSL, DDoS protection           |
| **Cron**        | node-cron                                           | Scheduled task execution (9 jobs)                     |
| **Testing**     | Vitest (backend) + Playwright (e2e)                 | Test suites                                           |

**Why This Stack?**

- **Next.js App Router** provides hybrid SSR/SSG/ISR for SEO-optimized pages, built-in image optimization, and excellent DX with TypeScript
- **Express.js** gives a lean, familiar backend for API endpoints and cron orchestration
- **Prisma + PostgreSQL (Supabase)** provides type-safe queries, connection pooling, and a fully managed cloud database with automatic backups
- **pnpm workspaces** keeps the monorepo structured with shared TypeScript configs
- Same external APIs (SerpAPI, Groq) — the business logic that makes the system unique is preserved

---

## Architecture Overview

```
                        ┌─────────────────┐
                        │   Cloudflare     │
                        │   CDN + SSL      │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  Next.js (App Router)   │
                    │  - SSR / ISR Pages      │
                    │  - API Route Handlers   │
                    │  - Client Components    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  Express.js API Server  │
                    │  - REST Endpoints       │
                    │  - Business Logic       │
                    │  - Cron Orchestration   │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
     │  PostgreSQL  │   │   SerpAPI    │   │  Groq API    │
     │ (Supabase)   │   │  (Search)    │   │  (AI Gen)    │
     └─────────────┘   └──────────────┘   └──────────────┘
```

**7-Stage Pipeline:**

1. **Trend Discovery** — SerpAPI trend mining → scoring algorithm → top 2 daily picks
2. **Keyword Selection** — Head term → modifiers → SerpAPI validation → priority scoring
3. **Content Guide Creation** — SERP analysis → data points → narrative angle → structure blueprint
4. **AI Content Generation** — Groq with structured prompt → JSON-validated output → quality gates
5. **SEO Optimization** — Title formula engine → meta generation → schema markup → heading validation
6. **Intelligent Linking** — TF-IDF similarity matching → tier 1/2 source citations → link graph
7. **Publishing** — Sitemap update → RSS feed → cache invalidation

See [Architecture](./guides/architecture.md) and [Content Pipeline](./guides/content-pipeline.md) for complete details.

---

## Cron Schedule

| Job               | Schedule (UTC)      | Purpose                                                 |
| ----------------- | ------------------- | ------------------------------------------------------- |
| morning_article   | Daily 08:00         | Full article generation pipeline (trend to publish)     |
| evening_article   | Daily 19:00         | Full article generation pipeline (alternating category) |
| trend_monitor     | Every 3 hours       | Discover and score trending topics via SerpAPI          |
| keyword_refresh   | Daily 02:00         | Regenerate keyword matrix and validate with SerpAPI     |
| content_refresh   | Daily 03:00         | Identify stale articles needing data refresh            |
| sitemap_generator | Daily 01:00         | Rebuild XML sitemap index and article sitemaps          |
| link_update       | Weekly Sunday 04:00 | Rebuild internal link graph across all articles         |
| seo_audit         | Weekly Sunday 05:00 | Technical SEO audit (links, schema, meta, duplicates)   |
| backup            | Weekly Sunday 06:00 | Database dump and file backup                           |

See [Cron Jobs](./cron-jobs.md) for schedules, exit codes, and dry-run testing.

---

## API Endpoints

### Public Endpoints (9)

| Method | Path            | Rate Limit | Auth           | Purpose                                                 |
| ------ | --------------- | ---------- | -------------- | ------------------------------------------------------- |
| GET    | `/api/trends`   | 100/hour   | None           | Current trending topics as JSON                         |
| GET    | `/api/keywords` | 100/hour   | None           | Keyword matrix opportunities as JSON                    |
| GET    | `/api/articles` | 200/hour   | None           | Published article list and search as JSON               |
| GET    | `/api/sitemap`  | 50/hour    | None           | Dynamic XML sitemap (index, articles, pages)            |
| GET    | `/api/rss`      | 100/hour   | None           | Full-text RSS 2.0 feed                                  |
| GET    | `/api/health`   | 50/hour    | None           | System health check with service statuses               |
| GET    | `/api/track`    | 500/hour   | None           | Lightweight page view tracking                          |
| GET    | `/api/settings` | 30/min     | None           | Public site settings (ad codes, header/body HTML)       |
| POST   | `/api/generate` | 10/hour    | Token required | Manual article generation trigger                       |
| POST   | `/api/webhook`  | 50/hour    | HMAC verify    | External service callback receiver                      |

### Admin Endpoints (15)

| Method | Path                                    | Rate Limit | Auth          | Purpose                        |
| ------ | --------------------------------------- | ---------- | ------------- | ------------------------------ |
| POST   | `/api/admin/auth/login`                 | 10/hour    | Token in body | Admin authentication           |
| GET    | `/api/admin/stats`                      | 100/hour   | Bearer token  | Dashboard statistics           |
| GET    | `/api/admin/articles`                   | 100/hour   | Bearer token  | Paginated article list (admin) |
| GET    | `/api/admin/articles/:id`               | 100/hour   | Bearer token  | Article detail with analytics  |
| PATCH  | `/api/admin/articles/:id`               | 50/hour    | Bearer token  | Update article                 |
| DELETE | `/api/admin/articles/:id`               | 20/hour    | Bearer token  | Delete/archive article         |
| POST   | `/api/admin/articles/:id/links`         | 50/hour    | Bearer token  | Add link to article            |
| DELETE | `/api/admin/articles/:id/links/:linkId` | 50/hour    | Bearer token  | Remove link from article       |
| GET    | `/api/admin/categories`                 | 100/hour   | Bearer token  | List categories                |
| POST   | `/api/admin/categories`                 | 50/hour    | Bearer token  | Create category                |
| PUT    | `/api/admin/categories/:id`             | 50/hour    | Bearer token  | Update category                |
| DELETE | `/api/admin/categories/:id`             | 20/hour    | Bearer token  | Delete category                |
| GET    | `/api/admin/analytics`                  | 50/hour    | Bearer token  | Time-series analytics          |
| GET    | `/api/admin/settings`                   | 100/hour   | Bearer token  | Get site settings (ad codes, HTML) |
| PUT    | `/api/admin/settings`                   | 100/hour   | Bearer token  | Update site settings           |

See [API Reference](./api-reference.md) for full request/response schemas, error codes, and examples.

---

## Glossary

| Term                           | Definition                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **AI Slop**                    | Generic, low-quality AI-generated content that summarizes existing articles without original analysis |
| **Content Guide**              | Structured document that instructs the AI what to write, what data to include, and what angle to take |
| **Content Refresh**            | Updating existing articles with new data while preserving URL and SEO value                           |
| **E-E-A-T**                    | Experience, Expertise, Authoritativeness, Trustworthiness — Google's quality signals                  |
| **Flesch-Kincaid**             | Readability score measuring grade level required to understand text                                   |
| **Groq**                       | AI inference provider offering fast, cost-effective access to Llama and Mixtral models                |
| **Head Term**                  | Core subject of a keyword (e.g., "LeBron James" in "LeBron James stats 2026")                         |
| **Internal Link Graph**        | Database of all internal links between articles for SEO equity distribution                           |
| **ISR**                        | Incremental Static Regeneration — Next.js feature for updating static pages without full rebuild      |
| **JSON-LD**                    | JavaScript Object Notation for Linked Data — format for structured data markup                        |
| **Keyword Difficulty**         | 0-100 score estimating how hard it is to rank for a keyword                                           |
| **Keyword Matrix**             | Systematic combination of head terms and modifiers to generate keyword opportunities                  |
| **Living Keyword Matrix**      | Auto-updating keyword database that expands based on trending data                                    |
| **Modifier**                   | Descriptive addition to a head term (e.g., "stats", "net worth", "injury update")                     |
| **PAA**                        | People Also Ask — Google's expandable question feature in search results                              |
| **Prisma**                     | Type-safe ORM for Node.js/TypeScript with auto-generated query client                                 |
| **PostgreSQL**                 | Relational database used via Supabase — cloud-hosted with connection pooling, automated backups       |
| **Programmatic SEO**           | Scaling content production through data and templates rather than manual writing                      |
| **Rank Math**                  | WordPress SEO plugin whose principles are implemented manually in this system                         |
| **Schema Markup**              | Structured data that helps search engines understand page content                                     |
| **SerpAPI**                    | Service that provides structured data from Google search results via API                              |
| **SERP**                       | Search Engine Results Page — the page Google shows after a search query                               |
| **Slug**                       | URL-friendly version of a title (e.g., "lebron-james-stats-2026")                                     |
| **SQLite**                     | Embedded SQL database engine — zero-config, file-based storage (used via Prisma for local dev only)   |
| **SSR**                        | Server-Side Rendering — rendering pages on the server per request                                     |
| **TTL**                        | Time To Live — duration before cached data expires                                                    |
| **Vector Similarity**          | Mathematical comparison of text embeddings to detect duplicate content                                |
| **Admin Token**                | 64-char hex shared secret in `ADMIN_TOKEN` env var used for admin bearer authentication               |
| **Daily-Aggregated Analytics** | Page view data rolled up per (articleId × date) for efficient time-series queries                     |
| **Category Reassignment**      | Moving articles from one category to another when a category is deleted                               |

---

## License

This project is proprietary software. All rights reserved. The code and documentation are provided for authorized use only. Redistribution or commercial use without explicit permission is prohibited.

---

## Attribution

GameDayWire was designed and developed as a programmatic SEO content automation platform. Built with Next.js 15, Express.js, Prisma ORM + PostgreSQL (Supabase), SerpAPI, Groq API, and Cloudflare CDN. Content generation powered by Llama 4 and Mixtral models via Groq API. Search data provided exclusively by SerpAPI.
