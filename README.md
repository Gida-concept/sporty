# GameDayWire

**Your Daily Sports & Entertainment News Feed**

GameDayWire is an autonomous programmatic SEO blog engine that discovers trending topics, validates them via SerpAPI, generates AI-written content through a structured Content Guide Engine, optimizes it for SEO, and publishes to a Next.js frontend — all without human intervention.

![Tech Stack](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![Tech Stack](https://img.shields.io/badge/Express-4.x-259dff?logo=express)
![Tech Stack](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tech Stack](https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm)

---

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 9+
git clone <repo-url>
cd gamedaywire
pnpm install
cp .env.example .env   # Edit with your API keys
npx prisma migrate dev --name init
pnpm seed
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Prisma Studio:** `npx prisma studio`

---

## Architecture Overview

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

1. **Trend Discovery** — SerpAPI trend mining → scoring → top 2 daily picks
2. **Keyword Selection** — Head term → modifiers → SerpAPI validation → priority scoring
3. **Content Guide Creation** — SERP analysis → data points → narrative angle → blueprint
4. **AI Content Generation** — Groq with structured prompt → JSON output → quality gates
5. **SEO Optimization** — Title formula → meta gen → schema markup → heading validation
6. **Intelligent Linking** — TF-IDF similarity → tier 1/2 citations → link graph
7. **Publishing** — Sitemap update → RSS feed → Google Indexing API → cache invalidation

---

## System Requirements

| Software | Version                  | Purpose            |
| -------- | ------------------------ | ------------------ |
| Node.js  | 20+ (22 LTS recommended) | JavaScript runtime |
| pnpm     | 9+                       | Package manager    |
| Git      | 2.x+                     | Version control    |

---

## Project Structure

```
gamedaywire/
├── frontend/          # Next.js 15 App Router + Tailwind CSS
├── backend/           # Express.js REST API + Prisma ORM
├── cron/              # 9 node-cron scheduled tasks
├── docs/              # Architecture, API, database documentation
├── scripts/           # Seed and utility scripts
├── docker-compose.yml # Local development container
└── package.json       # pnpm workspace root
```

See [Project Structure](./docs/project-structure.md) for the complete layout.

---

## Documentation

| Document                                              | Description                                      |
| ----------------------------------------------------- | ------------------------------------------------ |
| [Documentation Hub](./docs/README.md)                 | Entry point, glossary, navigation to all docs    |
| [Architecture Guide](./docs/guides/architecture.md)   | System design, caching, scaling, security        |
| [Content Pipeline](./docs/guides/content-pipeline.md) | 7-stage pipeline deep-dive                       |
| [SEO Strategy](./docs/guides/seo-strategy.md)         | Title formulas, schema, linking, monetization    |
| [Content Quality](./docs/guides/content-quality.md)   | Anti-slop rules, banned phrases, readability     |
| [API Reference](./docs/api-reference.md)              | All 21 endpoints with request/response schemas   |
| [Database Schema](./docs/database.md)                 | Prisma schema, migrations, seed data             |
| [Getting Started](./docs/getting-started.md)          | Complete setup guide with verification checklist |
| [Cron Jobs](./docs/cron-jobs.md)                      | All 9 scheduled tasks                            |
| [Admin Section](./docs/admin.md)                      | Dashboard, analytics, links, categories          |
| [Deployment](./docs/deployment.md)                    | Docker, VPS, environment reference               |
| [Monitoring](./docs/monitoring.md)                    | Health checks, alerts, success metrics           |
| [Troubleshooting](./docs/troubleshooting.md)          | Issue resolution by category                     |
| [SEO Checklist](./docs/seo-checklist.md)              | ~150 item verification checklist                 |

---

## License

Copyright (c) 2026 GameDayWire. All rights reserved.
