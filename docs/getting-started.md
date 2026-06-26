# Getting Started — GameDayWire

This guide provides complete, step-by-step instructions for setting up the GameDayWire blog system in both local development and production environments. Follow the sections in order.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Project Structure Overview](#2-project-structure-overview)
3. [API Key Setup](#3-api-key-setup)
4. [Database Setup](#4-database-setup)
5. [Running the Application](#5-running-the-application)
6. [Verification Checklist](#6-verification-checklist)
7. [Testing](#7-testing)
8. [Development Workflow](#8-development-workflow)
9. [Environment Configuration Reference](#9-environment-configuration-reference)

---

## 1. Local Development Setup

### 1.1 Prerequisites

Before starting, ensure your system meets the following requirements.

**Required Software:**

| Software | Version                  | Purpose                                    |
| -------- | ------------------------ | ------------------------------------------ |
| Node.js  | 20+ (22 LTS recommended) | JavaScript runtime                         |
| npm      | 10+                      | Package manager and workspace orchestrator |
| Git      | 2.x+                     | Version control                            |

**Optional but Recommended:**

| Software              | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| VS Code               | IDE with TypeScript support                        |
| Docker                | Containerized development (see docker-compose.yml) |
| TablePlus / Beekeeper | Database viewer (PostgreSQL compatible)             |

### 1.2 Step-by-Step Installation

**Step 1: Clone the Repository**

```bash
git clone https://github.com/your-username/sportytainment.git
cd sportytainment
```

**Step 2: Install Dependencies**

npm workspaces install dependencies for all packages (`frontend/`, `backend/`, `cron/`) with a single command:

```bash
npm install
```

This installs all dependencies and creates the Prisma client. If you encounter permission errors, ensure you're using npm 10+ (`npm --version`).

After installation, verify the workspace structure:

```bash
npm ls --workspaces
```

You should see the `frontend`, `backend`, and `cron` packages listed.

**Step 3: Configure Environment Variables**

Copy the example environment file to create your actual `.env` file:

```bash
cp .env.example .env
```

The `.env` file stores all sensitive credentials and configuration. It is listed in `.gitignore` and must never be committed to version control.

At minimum, populate the following fields before the system can function:

```env
# API Keys
SERPAPI_KEY=your-serpapi-key-here
GROQ_API_KEY=your-groq-api-key-here

# Site
SITE_URL=http://localhost:3000
SITE_NAME=GameDayWire
ADMIN_EMAIL=admin@example.com
```

See [Section 3](#3-api-key-setup) and [Section 9](#9-environment-configuration-reference) for all available variables.

**Step 4: Initialize the Database**

Prisma manages database migrations. Run the initial migration to create all tables:

```bash
npx prisma migrate dev --name init
```

This command:

1. Applies the Prisma schema to your PostgreSQL (Supabase) database
2. Creates the `prisma/migrations/` directory with migration history
3. Generates the Prisma client (`@prisma/client`)

The database is hosted on Supabase and accessed via the `DATABASE_URL` in your `.env`. The connection string should point to your Supabase PostgreSQL instance.

**Step 5: Seed Initial Data**

Seed the database with initial keywords and reference data:

```bash
npm run seed
```

The seed script populates:

- A set of initial head terms and modifiers in the keywords table to bootstrap the KeywordMatrix. Head terms include major sports leagues (NBA, NFL, Premier League, MLB, NHL), prominent athletes (LeBron James, Patrick Mahomes, Cristiano Ronaldo), entertainment franchises (Marvel, Netflix, Taylor Swift, Oscars), and broad categories (streaming services, sports betting, fantasy sports).
- Initial category and tag structures for the navigation system.

The seed script is idempotent — running it multiple times will not create duplicate entries. It uses `INSERT ... ON CONFLICT DO NOTHING` for unique constraints.

**Verification:**

```bash
# Verify the database was created
npx prisma studio
```

This opens Prisma Studio, a GUI for browsing your database. You can view all tables and their seeded data.

---

## 2. Project Structure Overview

The project is an npm monorepo with three packages:

```
sportytainment/
├── frontend/          # Next.js 15 App Router + Tailwind CSS
├── backend/           # Express.js + TypeScript + Prisma ORM
├── cron/              # node-cron scheduled tasks
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

**Key configuration files:**

| File                  | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `package.json`        | Root workspace config — scripts in root can run across all packages |
| `npm workspaces`      | Defined in root `package.json` — workspace packages: frontend, backend, cron |
| `tsconfig.json`       | Base TypeScript configuration (extended by all packages)            |
| `.env.example`        | Template for all environment variables                              |
| `docker-compose.yml`  | Optional Docker development setup                                   |

See [Project Structure](./project-structure.md) for the complete directory layout.

---

## 3. API Key Setup

### 3.1 SerpAPI

1. Go to [https://serpapi.com](https://serpapi.com) and create an account.
2. Choose a plan (free tier gives 100 searches/month; the $50/month plan provides 5,000 searches/month which is suitable for 2 articles/day).
3. Navigate to your dashboard and copy the API key from the "API Key" section.
4. Set it in your `.env` file:
   ```env
   SERPAPI_KEY=your-key-here
   ```

SerpAPI provides all the search data the system needs: trending searches, SERP analysis, news results, related questions (People Also Ask), related searches, and keyword validation. The system caches SerpAPI responses aggressively to minimize API usage and stay within plan limits.

**Verification:**

```bash
node -e "
import('node:https').then(https => {
  const key = process.env.SERPAPI_KEY || 'YOUR_KEY';
  https.get('https://serpapi.com/search.json?q=test&api_key=' + key + '&num=1', res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      const json = JSON.parse(data);
      console.log(json.search_metadata?.status === 'Success' ? 'API OK' : 'API Error: ' + json.error);
    });
  });
});
"
```

### 3.2 Groq API

1. Go to [https://groq.com](https://groq.com) and sign up for an API account.
2. Navigate to the API Keys section in your dashboard.
3. Generate a new API key.
4. Set it in your `.env` file:
   ```env
   GROQ_API_KEY=your-key-here
   ```

Groq provides inference for Llama 4 (70B) and Mixtral 8x7B models. The system uses Llama 4 as the primary model for content generation and Mixtral as the fallback. Groq's fast inference speed (~800 tokens/second) means articles typically generate in 10-20 seconds. Cost is approximately $5-10 per month for 60 articles.

**Verification:**

```bash
node -e "
import('node:https').then(https => {
  const key = process.env.GROQ_API_KEY || 'YOUR_KEY';
  const req = https.request('https://api.groq.com/openai/v1/models', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + key }
  }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log(res.statusCode === 200 ? 'API OK' : 'Error: HTTP ' + res.statusCode);
    });
  });
  req.end();
});
"
```

---

## 4. Database Setup

### 4.1 Database Technology

The system uses **PostgreSQL** (via Supabase) as its production database. For local development, you can either connect to your Supabase instance or switch to SQLite:

- **PostgreSQL (Supabase)** — Cloud-hosted, managed database with connection pooling, automatic backups, and SSL. Set `DATABASE_URL` to your Supabase connection string.
- **SQLite (local dev only)** — For offline development, change the Prisma schema provider to `"sqlite"` and set `DATABASE_URL="file:./dev.db"`. See [Database docs](./database.md) for instructions.

### 4.2 Database Schema

The system uses 10 database models:

| Model            | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `categories`     | Content categories with unique slugs (Sports, Entertainment, NBA, etc) |
| `trends`         | Stores trending search queries discovered by trendMonitor              |
| `keywords`       | The Living Keyword Matrix — keyword combinations with scores           |
| `articles`       | Primary content table — every published article                        |
| `article_categories` | Many-to-many join table linking articles to categories             |
| `page_views`     | Daily-aggregated page view analytics per article                       |
| `seo_metrics`    | SEO performance tracking over time                                     |
| `link_graph`     | Internal/external link records                                         |
| `content_guides` | Content Guide archives for audit trail                                 |
| `system_logs`    | Centralized logging for all system events                              |
| `site_settings`  | Key-value store for ad codes, header/body HTML injections              |

See [Database](./database.md) for the complete Prisma schema with all columns, constraints, and relationships.

### 4.3 Migration Workflow

**Creating a new migration (development):**

```bash
npx prisma migrate dev --name description_of_change
```

**Applying migrations to production:**

```bash
npx prisma migrate deploy
```

**Resetting the database (development only):**

```bash
npx prisma migrate reset
```

This drops all data and re-applies migrations. Never run this in production.

---

## 5. Running the Application

### 5.1 Development Mode

Start both the frontend and backend simultaneously:

```bash
npm run dev
```

This runs:

- **Frontend** (Next.js): http://localhost:3000
- **Backend** (Express): http://localhost:3001

Or start them individually:

```bash
# Frontend only
npm run dev -w frontend

# Backend only
npm run dev -w backend
```

### 5.2 Production Build

```bash
# Build both packages
npm run build

# Start production servers
npm run start
```

### 5.3 Testing Cron Jobs

All cron jobs have a dry-run mode that prevents side effects while executing all other logic normally:

```bash
# Dry-run the trend monitor (no database writes, no API calls with side effects)
node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true }).then(console.log).catch(console.error);
"

# Or using the cron test script:
npm run cron:dry-run -- trendMonitor
```

---

## 6. Verification Checklist

Run through this verification checklist after setup to confirm the system is fully operational.

### 6.1 Frontend

- [ ] Visit http://localhost:3000 and verify the homepage loads with correct layout.
- [ ] Check that CSS and JavaScript assets load correctly (no broken asset URLs).
- [ ] Verify navigation links, category pages, and static pages render.
- [ ] Test article URL pattern: http://localhost:3000/article/sample-slug/ (if any articles exist).
- [ ] Verify 404 page shows a user-friendly error (custom not-found page).
- [ ] Check that images load correctly.
- [ ] Verify the page is mobile-responsive (resize browser or use Chrome DevTools device emulation).

### 6.2 Backend API Health Check

- [ ] Check the health endpoint:

```bash
curl http://localhost:3001/api/health
```

- [ ] Verify the response status is `"ok"` (not `"degraded"` or `"critical"`).
- [ ] Check each service status individually:
  - [ ] serpapi: status = "ok"
  - [ ] groq: status = "ok"
  - [ ] database: status = "ok"
  - [ ] cache: status = "ok"
- [ ] Verify the timestamp is current (within 60 seconds of actual time).

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "checks": {
    "database": { "status": "ok", "latency_ms": 5 },
    "serpapi": { "status": "ok" },
    "groq": { "status": "ok" },
    "cache": { "status": "ok", "hit_rate": 0.85 }
  },
  "alerts": []
}
```

### 6.3 API Endpoints

- [ ] Verify trends API:

```bash
curl http://localhost:3001/api/trends
```

Returns JSON array of trend data (may be empty before first trend_monitor run).

- [ ] Verify keywords API:

```bash
curl http://localhost:3001/api/keywords
```

Returns keyword matrix data.

- [ ] Verify articles API:

```bash
curl http://localhost:3001/api/articles
```

Returns article list (may be empty before any articles are generated).

### 6.4 Sitemap and RSS

- [ ] Verify sitemap:

```bash
curl http://localhost:3001/api/sitemap
```

Should return valid XML with `<?xml version="1.0" encoding="UTF-8"?>`.

- [ ] Verify RSS feed:

```bash
curl http://localhost:3001/api/rss | head -20
```

Should return valid RSS 2.0 XML.

### 6.5 Database Verification

- [ ] Verify the database connection works:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('Database: OK'); prisma.\$disconnect(); })
  .catch(e => { console.error('Database: FAILED', e.message); process.exit(1); });
"
```

- [ ] Verify seeded data:

```bash
npx prisma studio
```

Browse the `keywords` table — should show initial head terms and modifiers.

### 6.6 Cache and Directory Verification

- [ ] Verify the application can write to cache directories:

```bash
node -e "
import('node:fs').then(fs => {
  const testFile = 'backend/cache/writable_test.txt';
  try {
    fs.writeFileSync(testFile, 'OK');
    console.log('Cache writable');
    fs.unlinkSync(testFile);
  } catch {
    console.log('Cache NOT writable');
  }
});
"
```

---

## 7. Testing

### 7.1 Running Tests

```bash
# Run all backend tests
npm run test

# Run frontend tests
npm run test -w frontend

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test -- --coverage
```

### 7.2 Test Structure

| Test Type                   | Tool       | Location                  | Coverage                                          |
| --------------------------- | ---------- | ------------------------- | ------------------------------------------------- |
| Unit tests (backend)        | Vitest     | `backend/tests/services/` | Core services (TrendFinder, KeywordMatrix, etc.)  |
| Integration tests (backend) | Vitest     | `backend/tests/routes/`   | API endpoints with mocked services                |
| E2E tests                   | Playwright | `frontend/tests/e2e/`     | Full user flows (homepage → article → navigation) |

### 7.3 Writing Tests

Services are designed with dependency injection for testability:

```typescript
// Example: Testing TrendFinder with mocked SerpAPI
import { TrendFinder } from '../src/services/TrendFinder';
import { describe, it, expect, vi } from 'vitest';

describe('TrendFinder', () => {
  it('should score trends correctly', async () => {
    const mockSerpAPI = { getTrendingSearches: vi.fn().mockResolvedValue([...]) };
    const finder = new TrendFinder(mockSerpAPI);
    const trends = await finder.discover('sports', ['US', 'GB']);
    expect(trends[0].trendScore).toBeGreaterThan(0);
  });
});
```

---

## 8. Development Workflow

### 8.1 Branch Strategy

```
main        -> Production deployment
develop     -> Integration branch
feature/*   -> New features
hotfix/*    -> Urgent fixes
release/*   -> Release candidates
```

### 8.2 Tagging

```
v1.0.0      -> Initial release
v1.1.0      -> New feature
v1.1.1      -> Bug fix
v2.0.0      -> Breaking change
```

### 8.3 Before Committing

```bash
# Run type checking across all packages
npm run typecheck

# Run tests
npm run test

# Lint
npm run lint
```

---

## 9. Environment Configuration Reference

The `.env` file contains all configuration for the system. Below is a complete reference of every setting, its purpose, and default values:

| Variable                         | Required | Default                 | Purpose                                              |
| -------------------------------- | -------- | ----------------------- | ---------------------------------------------------- |
| `SERPAPI_KEY`                    | Yes      | --                      | SerpAPI API key for search data                      |
| `GROQ_API_KEY`                   | Yes      | --                      | Groq API key for AI generation                       |
| `GOOGLE_SEARCH_CONSOLE_PROPERTY` | No       | --                      | Search Console property (sc-domain:example.com)      |
| `SITE_URL`                       | Yes      | http://localhost:3000   | Site URL (used for sitemap, canonical URLs, OG tags) |
| `SITE_NAME`                      | Yes      | GameDayWire             | Site name for schema, RSS, and branding              |
| `SITE_LOCALE`                    | No       | en_US                   | Site language/locale for hreflang and schema         |
| `ADMIN_EMAIL`                    | No       | admin@example.com       | Admin email for alerts and notifications             |
| `ARTICLES_PER_DAY`               | No       | 2                       | Number of articles generated daily                   |
| `MORNING_HOUR`                   | No       | 8                       | UTC hour for morning article generation              |
| `EVENING_HOUR`                   | No       | 19                      | UTC hour for evening article generation              |
| `MIN_SEARCH_VOLUME`              | No       | 500                     | Minimum monthly search volume for keyword selection  |
| `MAX_KEYWORD_DIFFICULTY`         | No       | 40                      | Maximum keyword difficulty (0-100)                   |
| `MIN_CPC`                        | No       | 0.50                    | Minimum CPC in USD for keyword selection             |
| `TARGET_COUNTRIES`               | No       | US,GB,CA,AU,IE,NZ,ZA,IN | Comma-separated country codes                        |
| `ENABLE_AUTO_PUBLISH`            | No       | true                    | Auto-publish articles without manual review          |
| `ENABLE_CONTENT_REFRESH`         | No       | true                    | Enable automatic article refresh                     |
| `ENABLE_LINK_REBUILD`            | No       | true                    | Enable weekly link graph rebuild                     |
| `ENABLE_SEO_AUDIT`               | No       | true                    | Enable weekly SEO audit                              |
| `ENABLE_NOTIFICATIONS`           | No       | true                    | Enable email/webhook alerts                          |
| `MAX_INTERNAL_LINKS`             | No       | 5                       | Maximum internal links per article                   |
| `MAX_EXTERNAL_LINKS`             | No       | 3                       | Maximum external links per article                   |
| `MIN_WORD_COUNT`                 | No       | 800                     | Minimum article word count                           |
| `MAX_WORD_COUNT`                 | No       | 1500                    | Maximum article word count                           |
| `TARGET_READING_LEVEL`           | No       | 65                      | Target Flesch-Kincaid reading level (0-100)          |
| `CACHE_ENABLED`                  | No       | true                    | Enable response caching                              |
| `CACHE_TTL_HTML`                 | No       | 86400                   | HTML cache TTL in seconds (24 hours)                 |
| `CACHE_TTL_API`                  | No       | 10800                   | API response cache TTL (3 hours)                     |
| `CACHE_TTL_SITEMAP`              | No       | 21600                   | Sitemap cache TTL (6 hours)                          |
| `DATABASE_URL`                   | Yes      | postgresql://...        | Prisma database connection string (Supabase PostgreSQL) |
| `PORT`                           | No       | 3001                    | Express server port                                  |
| `NEXT_PUBLIC_API_URL`            | Yes      | http://localhost:3001   | Backend API URL for frontend                         |

### Environment File Location

The `.env` file lives at the project root and is shared across all packages. Prisma reads `DATABASE_URL` from the project root `.env` automatically. The backend loads other variables from this file at startup.

---

## Quick Start Cheat Sheet

```bash
# Prerequisites
node --version    # Must be 20+
npm --version     # Must be 10+

# Setup
git clone https://github.com/your-username/sportytainment.git
cd sportytainment
npm install
cp .env.example .env
# Edit .env with your API keys
npx prisma migrate dev --name init
npm run seed

# Run
npm run dev

# Verify
curl http://localhost:3000
curl http://localhost:3001/api/health

# Test
npm run test

# Build for production
npm run build
npm run start
```
