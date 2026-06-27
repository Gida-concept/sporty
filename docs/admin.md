# Admin Section — GameDayWire

Comprehensive guide to the admin section: dashboard, article management, link management, category management, analytics, and authentication.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Admin Authentication](#2-admin-authentication)
3. [Dashboard](#3-dashboard)
4. [Article Management](#4-article-management)
5. [Link Management](#5-link-management)
6. [Category Management](#6-category-management)
7. [Analytics](#7-analytics)
8. [Admin API Reference](#8-admin-api-reference)
9. [Admin UI Overview](#9-admin-ui-overview)
10. [Architecture Decisions](#10-architecture-decisions)
11. [Site Settings](#11-site-settings)

---

## 1. Overview

### 1.1 Purpose

The admin section provides manual oversight and content management for the GameDayWire system. While the 7-stage pipeline runs fully autonomously, the admin section gives operators the ability to:

- **Monitor** — Dashboard with post counts, pageviews, and system health at a glance
- **Manage articles** — Search, filter, edit, archive, and review article content
- **Manage categories** — Create, edit, delete categories with proper article reassignment
- **Manage links** — Add and remove HTML links on articles (internal and external)
- **Track analytics** — Time-series view data per article with daily aggregation
- **Manage settings** — Update site-wide configuration (ad codes, HTML injections) via web form

### 1.2 Key Features

| Feature         | Description                                                                 | Admin Endpoint(s)                           |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| Dashboard       | Aggregate stats: total articles, views today, top articles, recent activity | `GET /api/admin/stats`                      |
| Article List    | Paginated, searchable, filterable article table with SEO metrics            | `GET /api/admin/articles`                   |
| Article Editor  | Edit metadata, assign categories, manage links, view analytics              | `GET/PATCH/DELETE /api/admin/articles/:id`  |
| Category CRUD   | Full create, read, update, delete for content categories                    | `GET/POST/PUT/DELETE /api/admin/categories` |
| Link Management | Add/remove internal and external links per article                          | `POST/DELETE /api/admin/articles/:id/links` |
| Analytics       | Daily time-series pageview data with summary statistics                     | `GET /api/admin/analytics`                  |

### 1.3 Access Model

The admin section is a password-protected route group under `/admin/*` in the Next.js frontend. All admin API endpoints are authenticated via a shared-secret bearer token (`ADMIN_TOKEN`). There is no user registration, role-based access, or session management — the system is designed for single-operator use.

---

## 2. Admin Authentication

### 2.1 Overview

Admin authentication uses a **shared-secret bearer token** model:

- A long random token is generated and stored in the `.env` file as `ADMIN_TOKEN`
- The frontend login page accepts a password and calls the auth API
- On successful authentication, the token is stored in `localStorage`
- All subsequent admin API requests include the token in the `Authorization: Bearer <token>` header

### 2.2 Environment Variable

```env
# .env
ADMIN_TOKEN=a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8
```

Generate a token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Authentication Flow

```
Visitor → /admin/login (enter password)
              ↓
         POST /api/admin/auth/login { token: "password" }
              ↓
         Backend compares password === process.env.ADMIN_TOKEN
              ↓
   Match?  →  Creates DB-backed session (random token, 24h TTL)
              Returns { session_token: "64-char-hex" }
   No match?  →  401 Unauthorized
              ↓
         Frontend stores session_token in localStorage
              ↓
         All admin API calls include:
           Authorization: Bearer <session_token>
              ↓
         Admin layout checks auth context:
           No token → redirect to /admin/login
           Token present → render admin pages
```

### 2.4 Security Notes

- The `ADMIN_TOKEN` is the sole authentication credential — treat it like a password
- Store it in `.env` (never committed to git)
- `Authorization` headers are encrypted over HTTPS
- No user model, no roles (beyond the shared admin role) — appropriate for single-operator use
- If the token is compromised, regenerate it in `.env` and restart the backend
- **Admin sessions are stored in PostgreSQL** via the `admin_sessions` table, not in memory. This means:
  - Sessions persist across server restarts and deploys (no more forced re-login on Fly.io deploys)
  - Each session has a 24-hour TTL (configurable via `ADMIN_SESSION_TTL` environment variable, in milliseconds)
  - Expired sessions are cleaned up automatically when a token is validated, and can also be bulk-cleaned via periodic maintenance
  - A database query is performed on every admin request to validate the session token — the `admin_sessions` table is indexed on `token` for fast lookups

---

## 3. Dashboard

### 3.1 Purpose

The dashboard provides a high-level overview of system performance and content health. It is the landing page at `/admin` after login.

### 3.2 Stats Cards

| Metric            | Description                          | Source                          |
| ----------------- | ------------------------------------ | ------------------------------- |
| Total Articles    | Count of all published articles      | `Article` (status: published)   |
| Total Views       | Sum of all pageviews across articles | `Article.pageviews`             |
| Views Today       | Pageviews recorded today             | `PageView` (date = today)       |
| Views This Week   | Pageviews in the last 7 days         | `PageView` (date >= 7 days ago) |
| Avg Views/Article | Total views / total articles         | Calculated                      |
| Total Links       | Count of all link graph entries      | `LinkGraph`                     |
| Total Categories  | Count of categories                  | `Category`                      |
| Published Today   | Articles published today             | `Article` (publishedAt = today) |

### 3.3 Dashboard API

**`GET /api/admin/stats`**

Returns aggregated data from multiple tables:

```json
{
  "status": "ok",
  "data": {
    "totalArticles": 342,
    "totalViews": 84500,
    "viewsToday": 320,
    "viewsThisWeek": 2450,
    "avgViewsPerArticle": 247,
    "totalLinks": 1560,
    "totalCategories": 8,
    "publishedToday": 2,
    "topArticles": [
      {
        "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
        "title": "LeBron James Stats 2025-2026: Historic Season Breakdown",
        "slug": "lebron-james-stats-2025-2026-season",
        "pageviews": 3420,
        "category": "sports"
      }
    ],
    "recentActivity": [
      {
        "type": "publish",
        "message": "Article published: Premier League Transfer Rumors 2026",
        "timestamp": "2026-06-19T08:00:00Z"
      }
    ]
  }
}
```

**Implementation:** The endpoint runs 6-8 parallel Prisma queries (count articles, sum pageviews, sum PageView today/this-week, count links, count categories, top 10 articles, recent system_logs). Response is cached for 60 seconds.

---

## 4. Article Management

### 4.1 Article List

**`GET /api/admin/articles`**

Returns a paginated, filterable, searchable list of all articles with metadata and SEO metrics.

**Query Parameters:**

| Parameter  | Type    | Default     | Description                                      |
| ---------- | ------- | ----------- | ------------------------------------------------ |
| page       | integer | 1           | Page number                                      |
| limit      | integer | 20          | Results per page (max 100)                       |
| search     | string  | —           | Full-text search on title/slug                   |
| status     | string  | published   | `published`, `draft`, `archived`, `all`          |
| categoryId | string  | —           | Filter by category UUID                          |
| sortBy     | string  | publishedAt | `publishedAt`, `pageviews`, `title`, `createdAt` |
| sortOrder  | string  | desc        | `asc` or `desc`                                  |

**Example Request:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/admin/articles?status=published&sortBy=pageviews&sortOrder=desc&limit=10"
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "articles": [
      {
        "id": "e5f6a7b8-...",
        "slug": "lebron-james-stats-2025-2026-season",
        "title": "LeBron James Stats 2025-2026: Historic Season Breakdown",
        "metaDescription": "Complete analysis of LeBron James' 2025-2026 NBA season...",
        "status": "published",
        "wordCount": 1240,
        "qualityScore": 87.3,
        "pageviews": 3420,
        "googlePosition": 8,
        "categories": [
          { "id": "cat-001", "name": "Sports", "slug": "sports" },
          { "id": "cat-003", "name": "NBA", "slug": "nba" }
        ],
        "keyword": { "id": "kw-001", "keyword": "LeBron James stats 2025-2026 season" },
        "publishedAt": "2026-06-18T08:00:00Z",
        "createdAt": "2026-06-18T06:00:00Z",
        "updatedAt": "2026-06-18T08:00:00Z"
      }
    ],
    "total": 342,
    "page": 1,
    "limit": 10,
    "totalPages": 35
  }
}
```

### 4.2 Single Article Detail

**`GET /api/admin/articles/:id`**

Returns full article detail including content, category assignments, links, and 30-day analytics.

**Example Response:**

```json
{
  "status": "ok",
  "data": {
    "id": "e5f6a7b8-...",
    "slug": "lebron-james-stats-2025-2026-season",
    "title": "LeBron James Stats 2025-2026: Historic Season Breakdown",
    "metaDescription": "...",
    "h1": "LeBron James 2025-2026 Season Stats: A Historic Campaign",
    "contentHtml": "<article>...</article>",
    "contentBlocks": [{ "type": "h2", "text": "..." }],
    "wordCount": 1240,
    "readingLevel": 64.5,
    "status": "published",
    "qualityScore": 87.3,
    "pageviews": 3420,
    "avgTimeOnPage": 185,
    "bounceRate": 42.5,
    "googlePosition": 8,
    "categories": [{ "id": "cat-001", "name": "Sports", "slug": "sports" }],
    "keyword": {
      "id": "kw-001",
      "keyword": "LeBron James stats 2025-2026 season"
    },
    "links": [
      {
        "id": "link-001",
        "targetSlug": "nba-playoffs-2026-predictions",
        "anchorText": "NBA playoffs 2026",
        "linkType": "internal",
        "contextSnippet": "The Lakers are poised for a deep run in the..."
      }
    ],
    "analytics": {
      "daily": [
        { "date": "2026-05-20", "pageviews": 120, "uniqueVisitors": 95 },
        { "date": "2026-05-21", "pageviews": 145, "uniqueVisitors": 110 }
      ],
      "total": {
        "pageviews": 3420,
        "uniqueVisitors": 2100,
        "avgTimeOnPage": 185
      }
    },
    "publishedAt": "2026-06-18T08:00:00Z",
    "createdAt": "2026-06-18T06:00:00Z",
    "updatedAt": "2026-06-18T08:00:00Z"
  }
}
```

### 4.3 Update Article

**`PATCH /api/admin/articles/:id`**

Updates article metadata, status, and category assignments.

**Request Body:**

```json
{
  "title": "Updated title (50-60 chars)",
  "metaDescription": "Updated meta description (150-160 chars)",
  "h1": "Updated H1 heading",
  "status": "published",
  "categoryIds": ["cat-001", "cat-002"]
}
```

All fields are optional — only provided fields are updated. `categoryIds` replaces all existing category assignments (not additive).

### 4.4 Delete Article

**`DELETE /api/admin/articles/:id`**

Performs a soft delete by setting `Article.status` to `"archived"`. Use `?hard=true` to permanently delete the row.

| Query Param  | Behavior                              |
| ------------ | ------------------------------------- |
| (none)       | Soft delete — status = `"archived"`   |
| `?hard=true` | Permanent row deletion (irreversible) |

---

## 5. Link Management

### 5.1 Source of Truth

The `LinkGraph` table is the canonical source for all article links. The `Article.internalLinks` and `Article.externalLinks` JSON fields are **denormalized caches** that mirror the `LinkGraph` entries. On every link CRUD operation, the Article JSON fields are automatically synced to match.

### 5.2 Add a Link

**`POST /api/admin/articles/:id/links`**

Adds an internal or external link to an article.

**Request Body:**

```json
{
  "targetSlug": "nba-playoffs-2026-predictions",
  "anchorText": "NBA playoffs 2026 predictions",
  "linkType": "internal",
  "contextSnippet": "The Lakers are poised for a deep run in the"
}
```

**Side Effects:**

1. Creates a new row in `LinkGraph`
2. Rebuilds `Article.internalLinks` or `Article.externalLinks` JSON to match

### 5.3 Remove a Link

**`DELETE /api/admin/articles/:id/links/:linkId`**

Removes a link from an article.

**Side Effects:**

1. Deletes the row from `LinkGraph`
2. Rebuilds `Article.internalLinks` or `Article.externalLinks` JSON to match

### 5.4 Link Sync Logic

The synchronization is handled by `LinkService.syncArticleLinks(articleId)`:

```typescript
async syncArticleLinks(articleId: string): Promise<void> {
  const links = await prisma.linkGraph.findMany({ where: { articleId } });
  const internal = links.filter(l => l.linkType === 'internal')
    .map(l => ({ target_slug: l.targetSlug, anchor_text: l.anchorText }));
  const external = links.filter(l => l.linkType === 'external')
    .map(l => ({ url: l.targetSlug, anchor_text: l.anchorText }));
  await prisma.article.update({
    where: { id: articleId },
    data: {
      internalLinks: JSON.stringify(internal),
      externalLinks: JSON.stringify(external),
    },
  });
}
```

---

## 6. Category Management

### 6.1 Category Model

Categories are stored as a full database model with many-to-many relationships to articles through a join table.

```prisma
model Category {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  trends      Trend[]
  keywords    Keyword[]
  articles    ArticleCategory[]
  @@map("categories")
}

model ArticleCategory {
  articleId  String
  categoryId String
  article    Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  @@id([articleId, categoryId])
  @@map("article_categories")
}
```

**Key design decisions:**

- Many-to-many via explicit join table (not implicit) for future extensibility (e.g., `isPrimary` flag)
- `onDelete: Restrict` on Category side prevents accidental deletion of categories with assigned articles
- `onDelete: Cascade` on Article side ensures clean cleanup when articles are removed
- Articles can belong to multiple categories simultaneously

### 6.2 List Categories

**`GET /api/admin/categories`**

Returns all categories with article counts.

**Response:**

```json
{
  "status": "ok",
  "data": {
    "categories": [
      {
        "id": "cat-001",
        "name": "Sports",
        "slug": "sports",
        "description": "Sports news, analysis, and features",
        "articleCount": 180,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-06-19T08:00:00Z"
      },
      {
        "id": "cat-002",
        "name": "Entertainment",
        "slug": "entertainment",
        "description": "Entertainment news and celebrity coverage",
        "articleCount": 162,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-06-19T08:00:00Z"
      }
    ]
  }
}
```

### 6.3 Create Category

**`POST /api/admin/categories`**

**Request Body:**

```json
{
  "name": "NBA",
  "slug": "nba",
  "description": "NBA basketball coverage including game recaps, trade rumors, and playoff analysis"
}
```

If `slug` is omitted, it is auto-generated from the name (lowercased, hyphenated).

### 6.4 Update Category

**`PUT /api/admin/categories/:id`**

**Request Body:**

```json
{
  "name": "National Basketball Association",
  "slug": "nba",
  "description": "Updated description for NBA coverage"
}
```

All fields optional — only provided fields are updated.

### 6.5 Delete Category

**`DELETE /api/admin/categories/:id`**

Requires a `reassignTo` parameter if articles are assigned to this category.

| Query Param                   | Behavior                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| `?reassignTo=<categoryId>`    | Moves all articles in this category to the target category, then deletes |
| (none, category has articles) | Returns 409 Conflict with error message                                  |
| (none, category is empty)     | Deletes the category immediately                                         |

This prevents accidental data loss. Articles are never orphaned — they must be reassigned to another category before the category is deleted.

---

## 7. Analytics

### 7.1 PageView Model

Analytics are stored in a daily-aggregated `PageView` table:

```prisma
model PageView {
  id             String   @id @default(uuid())
  articleId      String
  date           DateTime
  pageviews      Int      @default(0)
  uniqueVisitors Int      @default(0)
  avgTimeOnPage  Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  article        Article  @relation(fields: [articleId], references: [id])
  @@unique([articleId, date])
  @@index([date(sort: Desc)])
  @@index([articleId, date(sort: Desc)])
  @@map("page_views")
}
```

**Key design decisions:**

- Daily aggregation (one row per article per day) — avoids storing individual page view events
- `@@unique([articleId, date])` enables upsert semantics: on each view, increment the counter
- `Article.pageviews` is a denormalized lifetime counter synced from PageView aggregation
- The unique constraint makes queries efficient: `SUM(pageviews) WHERE articleId = X AND date BETWEEN A AND B`

### 7.2 Tracking Mechanism

Page views are recorded via a lightweight tracking endpoint:

```
GET /api/track?slug=<article-slug>
```

This endpoint is called by the Next.js article page via a tracking pixel (`<img>`) or `navigator.sendBeacon()`. It performs an upsert on the `PageView` table — incrementing the counter for today's date and the matching article.

**Flow:**

```
Visitor loads article → Next.js page renders tracking pixel
                             ↓
                    GET /api/track?slug=lebron-james-stats-2025-2026-season
                             ↓
                    Backend upserts PageView for today:
                      - Upsert: (articleId, date=today)
                      - Increment: pageviews += 1
                      - Increment: Article.pageviews += 1
```

**Analytics Service** (`AnalyticsService.ts`):

| Method                                                                 | Purpose                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | ----- | ------------------------------ | ------------------------------ |
| `recordView(slug: string): Promise<void>`                              | Upsert PageView for today + increment Article.pageviews |
| `getDailyStats(articleId: string, days: number): Promise<DailyStat[]>` | Return daily rows for an article                        |
| `getPeriodSummary(period: '7d'                                         | '30d'                                                   | '90d' | '1y'): Promise<PeriodSummary>` | Aggregated stats for dashboard |
| `getTopArticles(period: string, limit: number): Promise<TopArticle[]>` | Top N articles by views in a period                     |

### 7.3 Analytics API

**`GET /api/admin/analytics`**

**Query Parameters:**

| Parameter | Type   | Default | Description                    |
| --------- | ------ | ------- | ------------------------------ |
| period    | string | `30d`   | `7d`, `30d`, `90d`, `1y`       |
| articleId | string | —       | Filter to one specific article |

**Response:**

```json
{
  "status": "ok",
  "data": {
    "daily": [
      { "date": "2026-05-20", "pageviews": 120, "uniqueVisitors": 95 },
      { "date": "2026-05-21", "pageviews": 145, "uniqueVisitors": 110 }
    ],
    "summary": {
      "totalPageviews": 3420,
      "avgDailyViews": 114,
      "topDay": { "date": "2026-06-15", "pageviews": 280 },
      "totalUniqueVisitors": 2100
    },
    "topArticles": [
      {
        "id": "e5f6a7b8-...",
        "title": "LeBron James Stats 2025-2026: Historic Season Breakdown",
        "slug": "lebron-james-stats-2025-2026-season",
        "pageviews": 3420
      }
    ]
  }
}
```

---

## 8. Admin API Reference

### 8.1 Endpoint Overview

All admin endpoints are prefixed with `/api/admin/` and require `Authorization: Bearer <token>`.

| Method   | Path                                    | Rate Limit | Purpose                                      |
| -------- | --------------------------------------- | ---------- | -------------------------------------------- |
| `POST`   | `/api/admin/auth/login`                 | 10/hour    | Authenticate and receive token               |
| `GET`    | `/api/admin/stats`                              | 30/hour    | Dashboard aggregate statistics                       |
| `GET`    | `/api/admin/articles`                           | 60/hour    | Paginated article list with filters                  |
| `GET`    | `/api/admin/articles/:id`                       | 60/hour    | Single article detail + analytics                    |
| `PATCH`  | `/api/admin/articles/:id`                       | 30/hour    | Update article metadata                              |
| `DELETE` | `/api/admin/articles/:id`                       | 10/hour    | Soft-delete (or hard-delete with ?hard=true)         |
| `POST`   | `/api/admin/articles/:id/links`                 | 30/hour    | Add a link to an article                             |
| `DELETE` | `/api/admin/articles/:id/links/:linkId`         | 30/hour    | Remove a link from an article                        |
| `GET`    | `/api/admin/categories`                         | 30/hour    | List all categories                                  |
| `POST`   | `/api/admin/categories`                         | 10/hour    | Create a new category                                |
| `PUT`    | `/api/admin/categories/:id`                     | 10/hour    | Update a category                                    |
| `DELETE` | `/api/admin/categories/:id`                     | 10/hour    | Delete a category (with reassignment)                |
| `GET`    | `/api/admin/analytics`                          | 30/hour    | Time-series pageview data                            |
| `GET`    | `/api/admin/settings`                           | 100/hour   | Get site settings (ad codes, header/body HTML)       |
| `PUT`    | `/api/admin/settings`                           | 100/hour   | Update site settings                                 |
| `POST`   | `/api/admin/cron/morning-article`               | 20/hour    | Trigger morning article generation (08:00 UTC)       |
| `POST`   | `/api/admin/cron/evening-article`               | 20/hour    | Trigger evening article generation (19:00 UTC)       |
| `POST`   | `/api/admin/cron/trend-monitor`                 | 20/hour    | Trigger trend discovery (every 3 hours)              |
| `POST`   | `/api/admin/cron/keyword-refresh`               | 20/hour    | Trigger keyword matrix regeneration (02:00 UTC)      |
| `POST`   | `/api/admin/cron/content-refresh`               | 20/hour    | Trigger stale article refresh (03:00 UTC)            |
| `POST`   | `/api/admin/cron/sitemap-generator`             | 20/hour    | Trigger sitemap rebuild (01:00 UTC)                  |
| `POST`   | `/api/admin/cron/link-update`                   | 20/hour    | Trigger link graph rebuild (Sunday 04:00 UTC)        |
| `POST`   | `/api/admin/cron/seo-audit`                     | 20/hour    | Trigger SEO audit (Sunday 05:00 UTC)                 |
| `POST`   | `/api/admin/cron/backup`                        | 20/hour    | Trigger database backup (Sunday 06:00 UTC)           |
| `POST`   | `/api/admin/cron/run-all`                       | 20/hour    | Execute all cron jobs sequentially (manual testing)  |

### 8.2 Tracking Endpoint

| Method | Path         | Rate Limit | Purpose                                   |
| ------ | ------------ | ---------- | ----------------------------------------- |
| `GET`  | `/api/track` | 1000/hour  | Lightweight page view recording (no auth) |

### 8.3 Authentication

**POST /api/admin/auth/login**

```json
// Request
{ "password": "the-admin-token-value" }

// Response (200)
{ "token": "a7b8c9d0e1f2..." }

// Response (401)
{ "error": "Invalid credentials" }
```

All other admin endpoints require:

```
Authorization: Bearer a7b8c9d0e1f2...
```

On 401 response, the frontend clears the token from `localStorage` and redirects to `/admin/login`.

### 8.4 Error Codes

| Code | HTTP Status | Description                                                   |
| ---- | ----------- | ------------------------------------------------------------- |
| E009 | 409         | Category in use — articles must be reassigned before deletion |
| E010 | 401         | Admin authentication failure — invalid or missing token       |
| E011 | 500         | PageView write failure — tracking endpoint error              |

---

## 9. Admin UI Overview

### 9.1 Pages

| Route                  | File                           | Purpose                                                   |
| ---------------------- | ------------------------------ | --------------------------------------------------------- |
| `/admin`               | `admin/page.tsx`               | Dashboard with stats cards, top articles, recent activity |
| `/admin/login`         | `admin/login/page.tsx`         | Login form (single password field)                        |
| `/admin/articles`      | `admin/articles/page.tsx`      | Article table with search, filter, sort, paginate         |
| `/admin/articles/[id]` | `admin/articles/[id]/page.tsx` | Article editor: metadata, categories, links, analytics    |
| `/admin/categories`    | `admin/categories/page.tsx`    | Category CRUD table with inline create/edit/delete        |
| `/admin/analytics`     | `admin/analytics/page.tsx`     | Charts: views over time, top articles, period selector    |
| `/admin/settings`      | `admin/settings/page.tsx`      | Site settings: header HTML, body HTML, ad code management |

### 9.2 Components

| Component                  | Purpose                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| `admin/AdminLayout.tsx`    | Sidebar + header wrapper for all admin pages                                    |
| `admin/AdminSidebar.tsx`   | Navigation links (Dashboard, Articles, Categories, Analytics, Settings) with active state |
| `admin/StatsCard.tsx`      | Single stat with icon, label, value, and trend indicator                        |
| `admin/ArticleTable.tsx`   | Table with columns: title, status, views, categories, actions                   |
| `admin/ArticleEditor.tsx`  | Form to edit title, meta description, h1, status, categories                    |
| `admin/LinkManager.tsx`    | List article links + add/remove interface                                       |
| `admin/CategoryForm.tsx`   | Create/edit category name, slug, description                                    |
| `admin/CategoryTable.tsx`  | Table with columns: name, slug, article count, actions                          |
| `admin/AnalyticsChart.tsx` | Recharts-based line/bar chart for view data                                     |

### 9.3 Layout Structure

```
admin/layout.tsx
├── AuthGuard (checks token in AuthContext)
│   ├── No token → redirect to /admin/login
│   └── Token valid → render AdminLayout
│       ├── AdminSidebar
│       │   ├── Dashboard link
│       │   ├── Articles link
│       │   ├── Categories link
│       │   ├── Analytics link
│       │   ├── Settings link
│       │   └── Logout button
│       ├── AdminHeader (user info, logout)
│       └── Page content area
```

### 9.4 Auth Context

The `AuthContext` (React context) manages token state globally:

- **Login:** Stores token in React state + `localStorage`
- **Logout:** Clears token from state + `localStorage`, redirects to `/admin/login`
- **Hydration:** On mount, checks `localStorage` for existing token
- **401 handling:** If any admin API returns 401, auto-logout and redirect

### 9.5 Admin API Client

The `admin-api.ts` library wraps `fetch` with automatic token injection:

```typescript
// Example usage
import { adminApi } from '@/lib/admin-api';

// GET /api/admin/stats with auto-attached Authorization header
const stats = await adminApi.get('/api/admin/stats');

// PATCH /api/admin/articles/:id with body
const updated = await adminApi.patch(`/api/admin/articles/${id}`, {
  status: 'published',
  categoryIds: ['cat-001', 'cat-002'],
});
```

On 401 responses, `admin-api.ts` automatically clears the auth context and redirects.

---

## 10. Architecture Decisions

### 10.1 Why Shared-Secret Bearer Token?

| Factor         | Decision                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| **User count** | Single operator — no need for user registration or roles                              |
| **Complexity** | No JWT, no user model — sessions are simple DB rows with a bearer token               |
| **Security**   | Token lives in `.env` (file system), not database — database breach doesn't leak auth |
| **Persistence**| Sessions stored in PostgreSQL — survive server restarts and Fly.io deploys           |
| **Denial**     | Compromised token = regenerate in `.env` and restart. No user management needed       |

### 10.2 Why Daily-Aggregated PageView?

| Alternative                    | Pros                                                     | Cons                                                |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| **Individual event rows**      | Granular per-visitor data                                | Massive table growth (potentially millions of rows) |
| **Daily aggregation (chosen)** | Efficient queries, predictable table size, simple upsert | No per-visitor detail                               |
| **Article counter only**       | Simplest approach                                        | No time-series analytics                            |

Daily aggregation balances storage efficiency with analytics capability. One row per article per day yields ~730 rows/year for 2 daily articles.

### 10.3 Why Many-to-Many Categories?

| Model                       | Use Case                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| Single category per article | Simple blogs with fixed sections                                     |
| **Many-to-many (chosen)**   | Articles can span topics (e.g., "NBA trade deadline" = Sports + NBA) |
| Hierarchical categories     | Sub-categories with parent/child (e.g., Sports → NBA → Lakers)       |

The many-to-many approach with an explicit join table (`ArticleCategory`) allows:

- Articles to appear in multiple category listings
- Future extension (primary category flag, category ordering)
- Category CRUD without touching article table

### 10.4 Why Join Table Instead of Implicit Many-to-Many?

| Approach                         | Flexibility                                         |
| -------------------------------- | --------------------------------------------------- |
| Implicit Prisma many-to-many     | No ability to add metadata (ordering, primary flag) |
| **Explicit join table (chosen)** | Future fields: `isPrimary`, `sortOrder`, `addedAt`  |
| Array column on Article          | No referential integrity, hard to query             |

The explicit `ArticleCategory` model costs one extra table but provides referential integrity and extensibility.

---

## 11. Site Settings

### 11.1 Purpose

The Site Settings page (`/admin/settings`) provides a web-based form to manage global site-wide configuration values that are stored in the database rather than environment variables. This allows non-developer operators to update ad codes, analytics snippets, and custom HTML injections without touching `.env` files or redeploying.

### 11.2 Settings Fields

| Field                | Key                | Purpose                                                    |
| -------------------- | ------------------ | ---------------------------------------------------------- |
| Head HTML            | `head_html`        | HTML injected into `<head>` (analytics, meta tags, fonts)  |
| Body HTML            | `body_html`        | HTML injected after `<body>` (cookie banners, overlays)    |
| Header Banner Ad     | `ad_header_banner` | 728x90 leaderboard ad code above the site header           |
| Sidebar Ad 1         | `ad_sidebar_1`     | 300x250 ad in right sidebar (middle position)              |
| Sidebar Ad 2         | `ad_sidebar_2`     | 300x250 ad in right sidebar (bottom position)              |
| Article Sidebar Ad   | `ad_article_sidebar` | 300x250 ad on article page right sidebar                 |
| In-Article Ad 1      | `ad_in_article_1`  | 300x250 ad after ~3rd content block in article body        |
| In-Article Ad 2      | `ad_in_article_2`  | 300x250 ad after ~7th content block in article body        |

### 11.3 Backend: SiteSettingsService

The `SiteSettingsService` (`backend/src/services/SiteSettingsService.ts`) provides two methods backed by the `SiteSetting` Prisma model:

| Method                               | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `getAllSettings()`                   | Returns all settings as a flat key-value map |
| `updateSettings(settings)`           | Upserts provided settings, returns updated   |

**Data flow:**

```
Admin Settings Page → fetch("/api/admin/settings")
                       ↓
              AdminService calls SiteSettingsService.getAllSettings()
                       ↓
              JSON response to frontend
                       ↓
              User edits fields → PUT /api/admin/settings
                       ↓
              SiteSettingsService.updateSettings() → Prisma upsert
```

### 11.4 Data Model

The `SiteSetting` Prisma model is a simple key-value store:

```prisma
model SiteSetting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("site_settings")
}
```

### 11.5 Public Settings Endpoint

A public unauthenticated endpoint `GET /api/settings` (rate limited to 30/minute) exposes the current settings to the frontend for rendering. This endpoint returns the settings object without exposing any admin-only data:

```json
{
  "success": true,
  "data": {
    "head_html": "...",
    "body_html": "...",
    "ad_header_banner": "...",
    "ad_sidebar_1": "...",
    "ad_sidebar_2": "...",
    "ad_article_sidebar": "...",
    "ad_in_article_1": "...",
    "ad_in_article_2": "..."
  },
  "timestamp": "2026-06-23T12:00:00Z"
}
```

### 11.6 Frontend Rendering

Settings values are fetched by the public `GET /api/settings` endpoint and passed to frontend components:

- **LayoutShell** renders `ad_header_banner` above the site header on public pages
- **Sidebar** component fetches settings and passes ad codes to `AdSlot` components
- **Article page** fetches settings, passes ad codes to the sidebar AdSlot, and renders in-article ads between content blocks via the `splitBlocksWithAds()` helper
- **AdSlot** (`frontend/components/ui/AdSlot.tsx`) accepts a `customHtml` prop — when provided, renders the ad code via `dangerouslySetInnerHTML`; falls back to a placeholder when empty

### 11.7 Key Design Decisions

| Decision                        | Rationale                                                              |
| ------------------------------- | ---------------------------------------------------------------------- |
| **Key-value store**             | Simple, extensible — no schema changes needed to add new settings      |
| **Database-backed**             | Survives restarts, no .env changes needed for non-sensitive config     |
| **Separate public/admin APIs**  | Public GET is unauthenticated for frontend consumption; admin GET/PUT require bearer token |
| **`dangerouslySetInnerHTML`**   | Required for ad scripts; operator is responsible for trusting ad code sources |

---

## 12. Cron Job Triggers

The admin API includes 10 endpoint triggers (9 individual jobs + 1 run-all) for executing cron jobs on-demand. These endpoints are called by GitHub Actions scheduled workflows and can also be triggered manually via `workflow_dispatch` in the Actions tab.

### 12.1 Endpoint Overview

All cron trigger endpoints:
- Use `POST` method
- Require `Authorization: Bearer <admin_token>` header
- Rate limited to 20 requests per hour
- Accept optional `?dry_run=true` query parameter for testing

| Endpoint                           | Schedule                    | Purpose                                  |
| ---------------------------------- | --------------------------- | ---------------------------------------- |
| `/api/admin/cron/morning-article`  | Daily 08:00 UTC             | Full article generation pipeline (sports) |
| `/api/admin/cron/evening-article`  | Daily 19:00 UTC             | Full article generation pipeline (entertainment) |
| `/api/admin/cron/trend-monitor`    | Every 3 hours               | Discover and score trending topics       |
| `/api/admin/cron/keyword-refresh`  | Daily 02:00 UTC             | Regenerate keyword matrix                |
| `/api/admin/cron/content-refresh`  | Daily 03:00 UTC             | Identify stale articles for refresh      |
| `/api/admin/cron/sitemap-generator`| Daily 01:00 UTC             | Rebuild XML sitemap                      |
| `/api/admin/cron/link-update`      | Sunday 04:00 UTC            | Rebuild internal link graph              |
| `/api/admin/cron/seo-audit`        | Sunday 05:00 UTC            | Technical SEO health check               |
| `/api/admin/cron/backup`           | Sunday 06:00 UTC            | Database dump and file backup            |
| `/api/admin/cron/run-all`          | Manual only                 | Execute all 9 jobs sequentially          |

### 12.2 Example Request

```bash
# Trigger morning article generation
curl -X POST "https://gamedaywire.fly.dev/api/admin/cron/morning-article" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Dry run (no side effects)
curl -X POST "https://gamedaywire.fly.dev/api/admin/cron/morning-article?dry_run=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Run all jobs sequentially
curl -X POST "https://gamedaywire.fly.dev/api/admin/cron/run-all" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 12.3 Example Response

```json
{
  "success": true,
  "data": {
    "success": true,
    "exitCode": 0,
    "message": "Published article: lebron-james-stats-2026-season (sports)",
    "details": {
      "slug": "lebron-james-stats-2026-season",
      "category": "sports",
      "title": "LeBron James Stats 2026 Season: Historic Campaign"
    }
  },
  "timestamp": "2026-06-26T08:00:00Z"
}
```

### 12.4 Error Response

```json
{
  "success": false,
  "data": {
    "success": false,
    "exitCode": 1,
    "message": "Trend monitor failed: SerpAPI quota exceeded",
    "details": {
      "error": "SerpAPI quota exceeded"
    }
  },
  "timestamp": "2026-06-26T08:00:00Z"
}
```

The `run-all` endpoint returns an array of results instead of a single result:

```json
{
  "success": true,
  "data": {
    "results": [
      { "success": true, "exitCode": 0, "message": "...", "details": { "jobName": "sitemap_generator" } },
      { "success": true, "exitCode": 0, "message": "...", "details": { "jobName": "keyword_refresh" } }
    ]
  },
  "timestamp": "2026-06-26T08:00:00Z"
}
```

---

## See Also

- [API Reference](./api-reference.md) — All API endpoints including admin auth and rate limits
- [Database](./database.md) — Category, ArticleCategory, and PageView model schemas
- [Project Structure](./project-structure.md) — Admin routes, components, and services in the file tree
- [Deployment](./deployment.md) — `ADMIN_TOKEN` environment variable configuration
- [Architecture](./guides/architecture.md) — Admin system design principles
- [Cron Jobs](./cron-jobs.md) — Detailed cron job documentation and dry-run testing
