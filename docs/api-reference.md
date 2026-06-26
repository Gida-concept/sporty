# API Reference — GameDayWire

Full documentation for all 23 API endpoints, authentication, rate limiting, caching policies, error codes, and service interfaces.

---

## Table of Contents

1. [General Information](#1-general-information)
2. [Public API Endpoints](#2-public-api-endpoints)
3. [Admin API Endpoints](#3-admin-api-endpoints)
4. [Service Interfaces](#4-service-interfaces)
5. [Error Codes Reference](#5-error-codes-reference)
6. [Error Handling](#6-error-handling)

---

## 1. General Information

### 1.1 Overview

The system provides a RESTful API through Express.js route handlers. All endpoints are prefixed with `/api/`. Internal business logic is encapsulated in TypeScript services under `backend/src/services/`.

### 1.2 Base URL

- **Local Development:** `http://localhost:3001`
- **Production:** `https://yourdomain.com`

```
https://yourdomain.com/api/{endpoint}
```

### 1.3 Content Types

| Endpoint           | Request Content-Type | Response Content-Type                       |
| ------------------ | -------------------- | ------------------------------------------- |
| All GET endpoints  | N/A                  | `application/json` (except sitemap and rss) |
| POST /api/generate | `application/json`   | `application/json`                          |
| POST /api/webhook  | `application/json`   | `application/json`                          |
| /api/sitemap       | N/A                  | `application/xml`                           |
| /api/rss           | N/A                  | `application/rss+xml`                       |

### 1.4 Authentication & Security

- Most GET endpoints are publicly accessible.
- **POST /api/generate** requires a shared secret token passed as a query parameter:
  ```
  GET /api/generate?token=YOUR_SECRET_TOKEN
  ```
- **POST /api/webhook** uses HMAC-SHA256 signature verification with a shared webhook secret.
- **Admin endpoints** (`/api/admin/*`) require a bearer token set in the `Authorization` header:
  ```
  Authorization: Bearer YOUR_ADMIN_TOKEN
  ```
  The admin token is configured via the `ADMIN_TOKEN` environment variable (64-char hex). A `POST /api/admin/auth/login` endpoint accepts the token and returns a session token on success.
- Rate limiting is applied per IP address.
- All API keys are stored in `.env` (listed in `.gitignore`).

**Token Generation (public API):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

**Admin Token Generation:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

### 1.5 Response Format

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-19T08:00:00Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {}
  },
  "timestamp": "2026-06-19T08:00:00Z"
}
```

### 1.6 HTTP Status Codes

| Code | Meaning               | Usage                                   |
| ---- | --------------------- | --------------------------------------- |
| 200  | Success               | Request completed successfully          |
| 400  | Bad Request           | Missing or invalid parameters           |
| 401  | Unauthorized          | Missing or invalid authentication token |
| 403  | Forbidden             | IP blocked or insufficient permissions  |
| 404  | Not Found             | Resource not found                      |
| 405  | Method Not Allowed    | Wrong HTTP method for this endpoint     |
| 429  | Too Many Requests     | Rate limit exceeded                     |
| 500  | Internal Server Error | Unexpected server error                 |
| 502  | Bad Gateway           | Upstream API (SerpAPI/Groq) failure     |
| 503  | Service Unavailable   | Critical service is down                |
| 504  | Gateway Timeout       | Groq API timeout                        |

### 1.7 Rate Limiting & Caching

#### Rate Limits by Endpoint

| Endpoint                             | Rate Limit (per IP) | Burst     | Notes                                               |
| ------------------------------------ | ------------------- | --------- | --------------------------------------------------- |
| `/api/trends`                        | 100/hour            | 10/minute | Public, no auth needed                              |
| `/api/keywords`                      | 100/hour            | 10/minute | Public, no auth needed                              |
| `/api/articles`                      | 200/hour            | 20/minute | Higher limit for frontend rendering                 |
| `/api/sitemap`                       | 50/hour             | 5/minute  | Lower limit, cached aggressively                    |
| `/api/rss`                           | 100/hour            | 10/minute | Public, no auth needed                              |
| `/api/health`                        | 50/hour             | 5/minute  | Low limit, use external monitor with 5-min interval |
| `/api/generate`                      | 10/hour             | 1/minute  | Strict limit to conserve API credits                |
| `/api/webhook`                       | 50/hour             | 5/minute  | HMAC-authenticated                                  |
| `/api/track`                         | 500/hour            | 50/minute | Lightweight page view recording                     |
| `/api/settings`                      | 30/minute           | 5/minute  | Public site settings (ad codes, HTML)               |
| `/api/admin/auth/login`              | 10/hour             | 1/minute  | Admin authentication endpoint                       |
| `/api/admin/stats`                   | 100/hour            | 10/minute | Admin dashboard — token required                    |
| `/api/admin/articles`                | 100/hour            | 10/minute | Admin article listing — token required              |
| `/api/admin/articles/:id`            | 100/hour            | 10/minute | Admin article detail — token required               |
| `/api/admin/articles/:id` (PATCH)    | 50/hour             | 5/minute  | Article update — token required                     |
| `/api/admin/articles/:id` (DELETE)   | 20/hour             | 2/minute  | Article deletion — token required                   |
| `/api/admin/articles/:id/links`      | 50/hour             | 5/minute  | Link management — token required                    |
| `/api/admin/categories`              | 100/hour            | 10/minute | Category listing/creation — token required          |
| `/api/admin/categories/:id` (PUT)    | 50/hour             | 5/minute  | Category update — token required                    |
| `/api/admin/categories/:id` (DELETE) | 20/hour             | 2/minute  | Category deletion — token required                  |
| `/api/admin/analytics`               | 50/hour             | 5/minute  | Analytics data — token required                     |
| `/api/admin/settings`                | 100/hour            | 10/minute | Get/update site settings — token required           |

#### Cache TTL Summary

| Data Type                  | Cache TTL                          | Invalidation Trigger                          |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| HTML article pages         | 24 hours (ISR)                     | Article update or publish                     |
| API trend data             | 3 hours                            | New trend_monitor run                         |
| API keyword data           | 6 hours                            | keyword_refresh daily run                     |
| API article list           | 1 hour                             | Article publish or update                     |
| API sitemap XML            | 24 hours                           | Article publish, update, or sitemap_generator |
| API RSS feed               | 30 minutes                         | Article publish or update                     |
| API settings               | 5 minutes                          | Setting update via admin                      |
| SerpAPI trend responses    | 3 hours                            | Per cache key expiry                          |
| SerpAPI SERP analysis      | 7 days                             | Cache expiry (competitor data changes slowly) |
| SerpAPI news results       | 1 hour                             | Cache expiry (news changes frequently)        |
| SerpAPI keyword validation | 24 hours                           | keyword_refresh daily run                     |
| PageView tracking data     | No cache (real-time insert/upsert) | Per request                                   |

**Cache middleware enhancements (Phase 16):** The Express in-memory cache layer uses an LRU (Least Recently Used) eviction policy with a 10,000 entry capacity (upgraded from 500 FIFO). Default TTL is 120 seconds. Negative results (e.g., empty result sets) are cached for 15 seconds to prevent thundering herds. A global 30-second request timeout returns 503 on slow responses. The Groq API client includes a content-addressable response cache (1-hour TTL, 500 entry cap) and a 120-second AbortController timeout.

---

## 2. Public API Endpoints

### 2.1 GET /api/trends — Trending Searches

Returns the latest trending topics discovered by the `trendMonitor` cron job. Trends are scored, ranked, and filtered by the TrendFinder service.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter  | Type    | Required | Default | Validation                                                      | Description                       |
| ---------- | ------- | -------- | ------- | --------------------------------------------------------------- | --------------------------------- |
| category   | string  | No       | all     | `"sports"`, `"entertainment"`, or omit                          | Filter trends by content category |
| limit      | integer | No       | 20      | 1-100                                                           | Number of trends to return        |
| geo        | string  | No       | US      | 2-letter country code (US, GB, CA, AU, IE, NZ, ZA, IN) or "all" | Filter by target country          |
| min_volume | integer | No       | 500     | 0-100000                                                        | Minimum monthly search volume     |
| format     | string  | No       | json    | `"json"` or `"html"`                                            | Response format                   |

#### Example Request

```bash
curl "http://localhost:3001/api/trends?category=sports&limit=5&geo=US&min_volume=1000"
```

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "cached": true,
  "cache_expiry": "2026-06-19T11:00:00Z",
  "count": 5,
  "data": {
    "trends": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "query": "LeBron James retirement speculation 2026",
        "normalized_query": "lebron james retirement speculation 2026",
        "category": "sports",
        "search_volume": 8500,
        "growth_rate": 72.3,
        "geo": "US",
        "trend_score": 91.7,
        "fetched_at": "2026-06-19T06:00:00Z",
        "related_queries": [
          "LeBron James contract Lakers 2026",
          "LeBron James stats 2025-2026 season"
        ]
      }
    ]
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                                  |
| ----------- | ----------------- | -------------------------------------------- |
| 400         | INVALID_PARAMETER | category must be 'sports' or 'entertainment' |
| 400         | INVALID_PARAMETER | limit must be between 1 and 100              |
| 429         | RATE_LIMIT        | Exceeded 100 requests per hour               |

#### Cache Behavior

Trend data is cached for 3 hours. The response includes `"cached": true` when serving from cache and a `cache_expiry` field. If no trends have been discovered yet, returns an empty array.

---

### 2.2 GET /api/keywords — Keyword Matrix Data

Returns the current state of the Living Keyword Matrix, showing validated keyword opportunities with scores, difficulty, volume, and status.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter  | Type    | Required | Default        | Validation                                                                     | Description                  |
| ---------- | ------- | -------- | -------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| status     | string  | No       | approved       | `"pending"`, `"approved"`, `"rejected"`, `"used"`, `"all"`                     | Filter by lifecycle status   |
| category   | string  | No       | all            | `"sports"`, `"entertainment"`, `"all"`                                         | Filter by content category   |
| head_term  | string  | No       | none           | Any string, partial match                                                      | Filter by head term          |
| limit      | integer | No       | 50             | 1-200                                                                          | Number of keywords to return |
| offset     | integer | No       | 0              | Minimum 0                                                                      | Pagination offset            |
| sort_by    | string  | No       | priority_score | `"priority_score"`, `"search_volume"`, `"difficulty"`, `"cpc"`, `"created_at"` | Sort field                   |
| sort_order | string  | No       | desc           | `"asc"` or `"desc"`                                                            | Sort direction               |

#### Example Request

```bash
curl "http://localhost:3001/api/keywords?status=approved&category=sports&limit=10&sort_by=priority_score&sort_order=desc"
```

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "cached": true,
  "count": 10,
  "total": 247,
  "data": {
    "keywords": [
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "keyword": "LeBron James stats 2025-2026 season",
        "head_term": "LeBron James",
        "modifier": "stats 2025-2026 season",
        "search_volume": 5400,
        "difficulty": 28,
        "cpc": 1.85,
        "intent": "informational",
        "category": "sports",
        "priority_score": 267.86,
        "serp_features": ["featured_snippet", "people_also_ask", "top_stories"],
        "status": "approved",
        "times_targeted": 0,
        "created_at": "2026-06-18T12:00:00Z",
        "last_validated_at": "2026-06-18T12:00:00Z"
      }
    ]
  }
}
```

#### Cache Behavior

The keyword matrix is regenerated daily at 02:00 UTC. API responses are cached for 6 hours.

---

### 2.3 GET /api/articles — Published Articles

Returns a list of published articles with metadata, SEO metrics, and links. Supports search, filtering, and pagination.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter    | Type    | Required | Default      | Validation                                                                      | Description                  |
| ------------ | ------- | -------- | ------------ | ------------------------------------------------------------------------------- | ---------------------------- |
| category     | string  | No       | all          | `"sports"`, `"entertainment"`, `"all"`                                          | Filter by category           |
| status       | string  | No       | published    | `"published"`, `"draft"`, `"indexed"`, `"updated"`, `"all"`                     | Filter by status             |
| slug         | string  | No       | none         | Any valid slug                                                                  | Get a single article by slug |
| search       | string  | No       | none         | Minimum 3 chars                                                                 | Full-text search             |
| limit        | integer | No       | 20           | 1-100                                                                           | Results per page             |
| offset       | integer | No       | 0            | Minimum 0                                                                       | Pagination offset            |
| sort_by      | string  | No       | published_at | `"published_at"`, `"title"`, `"word_count"`, `"pageviews"`, `"google_position"` | Sort field                   |
| sort_order   | string  | No       | desc         | `"asc"` or `"desc"`                                                             | Sort direction               |
| include_body | boolean | No       | false        | `"true"` or `"false"`                                                           | Include full content_html    |

#### Example Request

```bash
curl "http://localhost:3001/api/articles?category=sports&limit=5&sort_by=published_at&sort_order=desc"
```

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "count": 5,
  "total": 342,
  "offset": 0,
  "limit": 5,
  "data": {
    "articles": [
      {
        "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
        "slug": "lebron-james-stats-2025-2026-season",
        "title": "LeBron James Stats 2025-2026: Historic Season Breakdown",
        "meta_description": "Complete analysis of LeBron James' 2025-2026 NBA season stats...",
        "h1": "LeBron James 2025-2026 Season Stats: A Historic Campaign",
        "category": "sports",
        "word_count": 1240,
        "reading_level": 64.5,
        "quality_score": 87.3,
        "status": "published",
        "published_at": "2026-06-18T08:00:00Z",
        "updated_at": "2026-06-18T08:00:00Z",
        "pageviews": 342,
        "google_position": 8,
        "internal_links": [
          {
            "target_slug": "nba-playoffs-2026-predictions",
            "anchor_text": "NBA playoffs 2026",
            "position": 3
          }
        ],
        "external_links": [
          {
            "url": "https://www.espn.com/nba/story/_/id/12345",
            "anchor_text": "ESPN",
            "source_name": "ESPN"
          }
        ],
        "schema_types": ["Article", "BreadcrumbList"],
        "featured_image_url": "https://yoursite.com/images/featured/lebron-james-stats-2025-2026-season.webp"
      }
    ]
  }
}
```

When `include_body=true`, each article also includes full `content_html` and `content_blocks` fields. This significantly increases response size.

---

### 2.4 GET /api/sitemap — XML Sitemaps

Generates and serves XML sitemaps dynamically. Supports a sitemap index (default) and paginated article sitemaps.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter | Type    | Required | Default | Validation                         | Description                          |
| --------- | ------- | -------- | ------- | ---------------------------------- | ------------------------------------ |
| type      | string  | No       | index   | `"index"`, `"articles"`, `"pages"` | Sitemap type                         |
| page      | integer | No       | 1       | 1-10                               | Page number (only for type=articles) |

#### Example Requests

```bash
# Get sitemap index
curl "http://localhost:3001/api/sitemap"

# Get paginated article sitemap (page 1)
curl "http://localhost:3001/api/sitemap?type=articles&page=1"
```

#### Response (Sitemap Index)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://yoursite.com/api/sitemap?type=articles&amp;page=1</loc>
    <lastmod>2026-06-19T01:00:00Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://yoursite.com/api/sitemap?type=articles&amp;page=2</loc>
    <lastmod>2026-06-19T01:00:00Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://yoursite.com/api/sitemap?type=pages</loc>
    <lastmod>2026-06-18T01:00:00Z</lastmod>
  </sitemap>
</sitemapindex>
```

#### Priority Logic

| Age/Performance                                    | Priority |
| -------------------------------------------------- | -------- |
| Published within 24 hours                          | 0.9      |
| Published within 7 days                            | 0.8      |
| Published within 30 days                           | 0.7      |
| Evergreen with traffic (>100 pageviews/month)      | 0.6      |
| Older, stable traffic                              | 0.5      |
| Underperforming (position >50 or bounce_rate >90%) | 0.3      |

---

### 2.5 GET /api/rss — RSS Feed

Serves a full-text RSS 2.0 feed optimized for Google Discover and RSS readers.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter | Type    | Required | Default | Validation                             | Description          |
| --------- | ------- | -------- | ------- | -------------------------------------- | -------------------- |
| limit     | integer | No       | 20      | 1-100                                  | Number of feed items |
| category  | string  | No       | all     | `"sports"`, `"entertainment"`, `"all"` | Filter by category   |

#### Example Request

```bash
curl "http://localhost:3001/api/rss?limit=10&category=entertainment"
```

#### Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GameDayWire - Sports &amp; Entertainment News</title>
    <link>https://yoursite.com</link>
    <description>Your daily source for original sports and entertainment analysis.</description>
    <language>en-US</language>
    <lastBuildDate>Thu, 19 Jun 2026 08:00:00 +0000</lastBuildDate>
    <atom:link href="https://yoursite.com/api/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://yoursite.com/images/logo.svg</url>
      <title>GameDayWire</title>
      <link>https://yoursite.com</link>
    </image>

    <item>
      <title>LeBron James Stats 2025-2026: Historic Season Breakdown</title>
      <link>https://yoursite.com/article/lebron-james-stats-2025-2026-season/</link>
      <guid isPermaLink="true">https://yoursite.com/article/lebron-james-stats-2025-2026-season/</guid>
      <pubDate>Thu, 19 Jun 2026 08:00:00 +0000</pubDate>
      <category>Sports</category>
      <category>NBA</category>
      <description>Complete analysis of LeBron James' 2025-2026 NBA season stats...</description>
      <content:encoded><![CDATA[Full article HTML content here...]]></content:encoded>
      <media:content url="https://yoursite.com/images/featured/lebron-james-stats-2025-2026-season.webp" medium="image" type="image/webp"/>
    </item>
  </channel>
</rss>
```

---

### 2.6 GET /api/health — System Health

Provides a comprehensive health check of all system components: external API connectivity, database responsiveness, cron job status, and cache health.

**Method:** GET

**Authentication:** None (public)

#### Query Parameters

| Parameter | Type    | Required | Default | Description                        |
| --------- | ------- | -------- | ------- | ---------------------------------- |
| verbose   | boolean | No       | false   | Include extended debug information |

#### Example Request

```bash
curl "http://localhost:3001/api/health"
```

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "uptime_seconds": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 5,
      "message": "Connection established successfully"
    },
    "serpapi": {
      "status": "ok",
      "last_success": "2026-06-19T07:30:00Z",
      "message": "API responsive"
    },
    "groq": {
      "status": "ok",
      "last_success": "2026-06-19T07:50:00Z",
      "message": "API responsive"
    },
    "cache": {
      "hit_rate": 0.85,
      "status": "ok",
      "message": "Cache directory writable and healthy"
    },
    "last_trend_monitor": {
      "last_run": "2026-06-19T06:00:00Z",
      "success": true,
      "trends_found": 12,
      "message": "Healthy"
    }
  },
  "alerts": []
}
```

#### Degraded Status

If a non-critical service is unavailable, status returns `"degraded"`:

```json
{
  "status": "degraded",
  "checks": {},
  "alerts": []
}
```

#### Critical Status

If a critical service (database, SerpAPI, or Groq) is unavailable, status returns `"critical"`.

The health endpoint is **never cached**. Each request performs lightweight connectivity checks.

---

### 2.7 POST /api/generate — Manual Article Generation

Triggers the full article generation pipeline manually.

**Method:** POST

**Authentication:** Required (token query parameter)

#### Query Parameters

| Parameter | Type   | Required | Default | Description          |
| --------- | ------ | -------- | ------- | -------------------- |
| token     | string | Yes      | none    | Authentication token |

#### Request Body (JSON)

| Parameter | Type    | Required    | Default     | Validation                        | Description                    |
| --------- | ------- | ----------- | ----------- | --------------------------------- | ------------------------------ |
| action    | string  | Yes         | none        | `"single"`, `"next"`, `"refresh"` | Generation action              |
| keyword   | string  | Conditional | none        | 3-200 chars                       | Required when action="single"  |
| category  | string  | No          | auto-detect | `"sports"`, `"entertainment"`     | Content category               |
| slug      | string  | Conditional | none        | Existing article slug             | Required when action="refresh" |
| force     | boolean | No          | false       | true/false                        | Bypass quality gates           |

#### Authentication

```
POST /api/generate?token=YOUR_SECRET_TOKEN
```

#### Example Requests

```bash
# Generate for a specific keyword
curl -X POST "http://localhost:3001/api/generate?token=abc123" \
  -H "Content-Type: application/json" \
  -d '{"action": "single", "keyword": "Premier League transfer rumors 2026", "category": "sports"}'

# Generate the next trending topic
curl -X POST "http://localhost:3001/api/generate?token=abc123" \
  -H "Content-Type: application/json" \
  -d '{"action": "next", "category": "entertainment"}'

# Refresh an existing article
curl -X POST "http://localhost:3001/api/generate?token=abc123" \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh", "slug": "lebron-james-stats-2025-2026-season", "force": true}'
```

#### Response Schema

**Success:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T09:00:00Z",
  "data": {
    "article_id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "slug": "premier-league-transfer-rumors-2026",
    "title": "Premier League Transfer Rumors 2026: Latest Summer Window Updates",
    "status": "published",
    "url": "https://yoursite.com/article/premier-league-transfer-rumors-2026/",
    "word_count": 1150,
    "quality_score": 91.2,
    "message": "Article generated successfully",
    "generation_time_ms": 45200
  }
}
```

**Draft (quality gate warning):**

```json
{
  "status": "ok",
  "data": {
    "slug": "premier-league-transfer-rumors-2026",
    "status": "draft",
    "message": "Article generated but saved as draft. Manual review recommended."
  }
}
```

**Failure:**

```json
{
  "status": "error",
  "error": {
    "code": "QUALITY_GATE_FAILED",
    "message": "Generated content failed quality gate: Insufficient data points",
    "details": {
      "failed_checks": ["data_points", "word_count"],
      "retry_allowed": true
    }
  }
}
```

---

### 2.8 POST /api/webhook — Webhook Receiver

Receives webhook callbacks from external services with HMAC signature verification.

**Method:** POST

**Authentication:** HMAC-SHA256 signature verification

#### Required Headers

| Header              | Required | Description                                           |
| ------------------- | -------- | ----------------------------------------------------- |
| Content-Type        | Yes      | `application/json`                                    |
| X-Webhook-Signature | Yes      | HMAC-SHA256 signature of the request body             |
| X-Webhook-Source    | No       | Identifier (e.g., "serpapi", "uptimerobot", "custom") |

#### Supported Events

| Event              | Source      | Action Taken                            |
| ------------------ | ----------- | --------------------------------------- |
| rate_limit_warning | serpapi     | Log warning and send admin notification |
| monitor_down       | uptimerobot | Log alert and trigger health check      |
| monitor_up         | uptimerobot | Log recovery                            |
| clear_cache        | custom      | Clear all or specific cache directories |
| regenerate_sitemap | custom      | Trigger sitemap regeneration            |
| run_audit          | custom      | Trigger SEO audit                       |
| test_webhook       | any         | Log receipt and return success          |

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "event_received": "rate_limit_warning",
    "source": "serpapi",
    "action_taken": "logged",
    "message": "Webhook processed successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                    |
| ----------- | ----------------- | ------------------------------ |
| 400         | INVALID_PAYLOAD   | Request body is not valid JSON |
| 401         | INVALID_SIGNATURE | HMAC signature does not match  |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour  |

---

### 2.9 GET /api/track — Page View Tracking

Lightweight endpoint for recording article page views. Called client-side (or via Next.js rewrite) on every article page load. Uses upsert semantics on the `page_views` table keyed by `articleId + date`.

**Method:** GET

**Authentication:** None (public — lightweight, rate-limited)

#### Query Parameters

| Parameter  | Type   | Required | Default | Description                                                            |
| ---------- | ------ | -------- | ------- | ---------------------------------------------------------------------- |
| article_id | string | Yes      | none    | UUID of the article being viewed                                       |
| ref        | string | No       | direct  | Referrer identifier (`"direct"`, `"google"`, `"social"`, `"internal"`) |

#### Example Request

```bash
curl "http://localhost:3001/api/track?article_id=e5f6a7b8-c9d0-1234-efab-345678901234&ref=google"
```

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "data": {
    "recorded": true,
    "message": "Page view recorded"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                    |
| ----------- | ----------------- | ------------------------------ |
| 400         | MISSING_PARAMETER | article_id is required         |
| 429         | RATE_LIMIT        | Exceeded 500 requests per hour |
| 500         | E011              | PageView insert/upsert failure |

#### Cache Behavior

The tracking endpoint is **never cached**. Each request performs a real-time upsert into the `page_views` table. High rate limit (500/hour) allows for frontend rendering and client-side calls.

---

### 2.10 POST /api/subscribe — Newsletter Subscription

Subscribes an email address to the newsletter.

**Method:** POST

**Authentication:** None (public)

#### Request Body (JSON)

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| email     | string | Yes      | Subscriber email address |

#### Example Request

```bash
curl -X POST "http://localhost:3001/api/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### Response Schema

**Success (200):**

```json
{
  "success": true,
  "message": "Successfully subscribed!"
}
```

**Already subscribed (409):**

```json
{
  "success": false,
  "error": "Already subscribed"
}
```

#### Error Responses

| HTTP Status | Error Code          | Description                 |
| ----------- | ------------------- | --------------------------- |
| 400         | Invalid email       | Email format validation     |
| 409         | Already subscribed  | Email already in subscriber list |
| 500         | Internal error      | Unexpected server error     |

#### Cache Behavior

No caching. Each subscription is processed immediately and stored in memory. On server restart, the subscriber list resets. A persistent store (database or third-party email service) should be used in production.

---

### 2.11 GET /api/settings — Public Site Settings

Returns the current site-wide configuration values (ad codes, header/body HTML) for frontend rendering. This is the public, unauthenticated counterpart to the admin settings endpoints.

**Method:** GET

**Authentication:** None (public — rate-limited)

**Rate Limit:** 30/minute, 5/minute burst

#### Query Parameters

None.

#### Example Request

```bash
curl "http://localhost:3001/api/settings"
```

#### Response Schema

```json
{
  "success": true,
  "data": {
    "head_html": "<!-- Google Analytics --><script>...</script>",
    "body_html": "<!-- Cookie banner --><div id=\"cookie-banner\">...</div>",
    "ad_header_banner": "<ins class=\"adsbygoogle\" style=\"display:inline-block;width:728px;height:90px\">...</ins>",
    "ad_sidebar_1": "<ins class=\"adsbygoogle\" style=\"display:inline-block;width:300px;height:250px\">...</ins>",
    "ad_sidebar_2": "",
    "ad_article_sidebar": "",
    "ad_in_article_1": "",
    "ad_in_article_2": ""
  },
  "timestamp": "2026-06-23T12:00:00Z"
}
```

#### Cache Behavior

Settings responses are cached for 5 minutes. Cache is invalidated when settings are updated via the admin PUT endpoint.

#### Error Responses

| HTTP Status | Error Code        | Description                        |
| ----------- | ----------------- | ---------------------------------- |
| 429         | RATE_LIMIT        | Exceeded 30 requests per minute    |
| 500         | INTERNAL_ERROR    | Database read failure              |

---

## 3. Admin API Endpoints

The admin API provides dashboard, article management, category management, link management, and analytics endpoints. All admin endpoints require bearer token authentication.

### 3.1 POST /api/admin/auth/login — Admin Authentication

Authenticates the admin user and returns a session token.

**Method:** POST

**Authentication:** Token in request body

#### Request Body (JSON)

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| token     | string | Yes      | The ADMIN_TOKEN value from .env |

#### Example Request

```bash
curl -X POST "http://localhost:3001/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123def456..."}'
```

#### Response Schema

**Success:**

```json
{
  "status": "ok",
  "data": {
    "authenticated": true,
    "session_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expires_in": 86400,
    "message": "Authentication successful"
  }
}
```

**Failure:**

```json
{
  "status": "error",
  "error": {
    "code": "E010",
    "message": "Admin authentication failure: invalid token"
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                   |
| ----------- | ---------- | ----------------------------- |
| 401         | E010       | Invalid admin token           |
| 429         | RATE_LIMIT | Exceeded 10 requests per hour |

---

### 3.2 GET /api/admin/stats — Dashboard Statistics

Returns aggregated dashboard statistics including total article count, per-category counts, total page views, average metrics, and recent activity.

**Method:** GET

**Authentication:** Bearer token required

#### Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "data": {
    "total_articles": 342,
    "articles_by_category": {
      "sports": 187,
      "entertainment": 155
    },
    "articles_by_status": {
      "published": 310,
      "draft": 22,
      "archived": 10
    },
    "total_pageviews": 284500,
    "total_unique_visitors": 124300,
    "avg_time_on_page_seconds": 145,
    "avg_quality_score": 87.3,
    "total_categories": 8,
    "total_keywords_approved": 247,
    "recent_activity": {
      "articles_today": 2,
      "articles_this_week": 14,
      "articles_this_month": 58
    }
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 429         | RATE_LIMIT | Exceeded 100 requests per hour |

---

### 3.3 GET /api/admin/articles — Article List (Admin)

Returns a paginated list of all articles (including drafts and archived) with admin-relevant fields.

**Method:** GET

**Authentication:** Bearer token required

#### Query Parameters

| Parameter   | Type    | Required | Default      | Validation                                                                 | Description           |
| ----------- | ------- | -------- | ------------ | -------------------------------------------------------------------------- | --------------------- |
| status      | string  | No       | all          | `"published"`, `"draft"`, `"archived"`, `"all"`                            | Filter by status      |
| category_id | string  | No       | all          | Valid UUID                                                                 | Filter by category ID |
| search      | string  | No       | none         | Minimum 3 chars                                                            | Search title or slug  |
| limit       | integer | No       | 20           | 1-100                                                                      | Results per page      |
| offset      | integer | No       | 0            | Minimum 0                                                                  | Pagination offset     |
| sort_by     | string  | No       | published_at | `"published_at"`, `"title"`, `"word_count"`, `"pageviews"`, `"updated_at"` | Sort field            |
| sort_order  | string  | No       | desc         | `"asc"` or `"desc"`                                                        | Sort direction        |

#### Example Request

```bash
curl "http://localhost:3001/api/admin/articles?status=draft&limit=10" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "count": 10,
  "total": 22,
  "offset": 0,
  "limit": 10,
  "data": {
    "articles": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "slug": "premier-league-transfer-rumors-2026",
        "title": "Premier League Transfer Rumors 2026: Latest Summer Window Updates",
        "status": "draft",
        "category_id": "b2c3d4e5-f6a7-8901-bcde-234567890123",
        "word_count": 1150,
        "quality_score": 72.1,
        "pageviews": 0,
        "created_at": "2026-06-18T12:00:00Z",
        "updated_at": "2026-06-18T12:00:00Z",
        "published_at": null
      }
    ]
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 429         | RATE_LIMIT | Exceeded 100 requests per hour |

---

### 3.4 GET /api/admin/articles/:id — Article Detail (Admin)

Returns full article data including analytics, SEO metrics, links, and categories.

**Method:** GET

**Authentication:** Bearer token required

#### URL Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| id        | string | Article UUID |

#### Example Request

```bash
curl "http://localhost:3001/api/admin/articles/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "article": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "premier-league-transfer-rumors-2026",
      "title": "Premier League Transfer Rumors 2026: Latest Summer Window Updates",
      "meta_description": "Complete coverage of Premier League summer 2026 transfer window...",
      "h1": "Premier League Transfer Rumors 2026",
      "status": "published",
      "word_count": 1150,
      "reading_level": 64.5,
      "quality_score": 87.3,
      "published_at": "2026-06-18T08:00:00Z",
      "updated_at": "2026-06-19T08:00:00Z",
      "categories": [{ "id": "b2c3d4e5-...", "name": "Sports", "slug": "sports" }],
      "pageviews": 342,
      "unique_visitors": 187,
      "avg_time_on_page": 145,
      "google_position": 8,
      "seo_score": 92,
      "internal_links": [
        {
          "id": "...",
          "target_slug": "nba-playoffs-2026",
          "anchor_text": "NBA playoffs 2026",
          "position": 3
        }
      ],
      "external_links": [
        {
          "id": "...",
          "url": "https://www.espn.com/...",
          "anchor_text": "ESPN",
          "source_name": "ESPN"
        }
      ]
    }
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 404         | NOT_FOUND  | Article not found              |
| 429         | RATE_LIMIT | Exceeded 100 requests per hour |

---

### 3.5 PATCH /api/admin/articles/:id — Update Article

Updates article metadata, status, or content. Does not fully regenerate the article — use the generate endpoint for full regeneration.

**Method:** PATCH

**Authentication:** Bearer token required

#### Request Body (JSON)

| Parameter        | Type     | Required | Description                            |
| ---------------- | -------- | -------- | -------------------------------------- |
| title            | string   | No       | Updated title                          |
| meta_description | string   | No       | Updated meta description               |
| h1               | string   | No       | Updated H1                             |
| status           | string   | No       | `"published"`, `"draft"`, `"archived"` |
| category_ids     | string[] | No       | Array of category UUIDs to assign      |

#### Example Request

```bash
curl -X PATCH "http://localhost:3001/api/admin/articles/a1b2..." \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "published", "category_ids": ["b2c3...", "c3d4..."]}'
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "article_id": "a1b2c3d4-...",
    "slug": "premier-league-transfer-rumors-2026",
    "status": "published",
    "message": "Article updated successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                              |
| ----------- | ----------------- | ---------------------------------------- |
| 400         | INVALID_PARAMETER | Invalid status or malformed category_ids |
| 401         | E010              | Missing or invalid admin token           |
| 404         | NOT_FOUND         | Article not found                        |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour            |

---

### 3.6 DELETE /api/admin/articles/:id — Delete / Archive Article

Deletes or archives an article. By default archives (status=archived). Pass `permanent=true` to remove from database.

**Method:** DELETE

**Authentication:** Bearer token required

#### Query Parameters

| Parameter | Type    | Required | Default | Description                      |
| --------- | ------- | -------- | ------- | -------------------------------- |
| permanent | boolean | No       | false   | Permanently delete from database |

#### Example Request

```bash
curl -X DELETE "http://localhost:3001/api/admin/articles/a1b2..." \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "article_id": "a1b2c3d4-...",
    "status": "archived",
    "message": "Article archived successfully"
  }
}
```

**Permanent deletion:**

```json
{
  "status": "ok",
  "data": {
    "article_id": "a1b2c3d4-...",
    "deleted": true,
    "message": "Article permanently deleted"
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 404         | NOT_FOUND  | Article not found              |
| 429         | RATE_LIMIT | Exceeded 20 requests per hour  |

---

### 3.7 POST /api/admin/articles/:id/links — Add Link to Article

Adds an internal or external link to an article. The link is recorded in both the `link_graph` table and the article's JSON links array.

**Method:** POST

**Authentication:** Bearer token required

#### Request Body (JSON)

| Parameter   | Type   | Required | Description                                                    |
| ----------- | ------ | -------- | -------------------------------------------------------------- |
| url         | string | Yes      | Target URL (absolute for external, relative slug for internal) |
| anchor_text | string | Yes      | Visible link text                                              |
| type        | string | Yes      | `"internal"` or `"external"`                                   |
| source_name | string | No       | Name of the external source (required if type=external)        |

#### Example Request

```bash
curl -X POST "http://localhost:3001/api/admin/articles/a1b2.../links" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.espn.com/nba/story/...", "anchor_text": "ESPN NBA Coverage", "type": "external", "source_name": "ESPN"}'
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "link_id": "d4e5f6a7-...",
    "article_id": "a1b2c3d4-...",
    "url": "https://www.espn.com/nba/story/...",
    "anchor_text": "ESPN NBA Coverage",
    "type": "external",
    "message": "Link added successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                       |
| ----------- | ----------------- | --------------------------------- |
| 400         | INVALID_PARAMETER | Missing url, anchor_text, or type |
| 401         | E010              | Missing or invalid admin token    |
| 404         | NOT_FOUND         | Article not found                 |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour     |

---

### 3.8 DELETE /api/admin/articles/:id/links/:linkId — Remove Link from Article

Removes a link from an article's link graph entry.

**Method:** DELETE

**Authentication:** Bearer token required

#### URL Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| id        | string | Article UUID |
| linkId    | string | Link UUID    |

#### Example Request

```bash
curl -X DELETE "http://localhost:3001/api/admin/articles/a1b2.../links/d4e5..." \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "link_id": "d4e5f6a7-...",
    "article_id": "a1b2c3d4-...",
    "removed": true,
    "message": "Link removed successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 404         | NOT_FOUND  | Link or article not found      |
| 429         | RATE_LIMIT | Exceeded 50 requests per hour  |

---

### 3.9 GET /api/admin/categories — List Categories

Returns all categories with article counts.

**Method:** GET

**Authentication:** Bearer token required

#### Example Request

```bash
curl "http://localhost:3001/api/admin/categories" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "categories": [
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-234567890123",
        "name": "Sports",
        "slug": "sports",
        "description": "Sports news, analysis, and updates",
        "article_count": 187,
        "created_at": "2026-01-01T00:00:00Z"
      },
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "name": "Entertainment",
        "slug": "entertainment",
        "description": "Entertainment news, reviews, and features",
        "article_count": 155,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 429         | RATE_LIMIT | Exceeded 100 requests per hour |

---

### 3.10 POST /api/admin/categories — Create Category

Creates a new content category.

**Method:** POST

**Authentication:** Bearer token required

#### Request Body (JSON)

| Parameter   | Type   | Required | Description                            |
| ----------- | ------ | -------- | -------------------------------------- |
| name        | string | Yes      | Category name (e.g., "Technology")     |
| slug        | string | Yes      | URL-friendly slug (e.g., "technology") |
| description | string | No       | Category description                   |

#### Example Request

```bash
curl -X POST "http://localhost:3001/api/admin/categories" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Technology", "slug": "technology", "description": "Tech news and reviews"}'
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "id": "d4e5f6a7-b8c9-0123-defa-456789012345",
    "name": "Technology",
    "slug": "technology",
    "description": "Tech news and reviews",
    "article_count": 0,
    "message": "Category created successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                                                      |
| ----------- | ----------------- | ---------------------------------------------------------------- |
| 400         | INVALID_PARAMETER | Missing name or slug, or slug already exists (unique constraint) |
| 401         | E010              | Missing or invalid admin token                                   |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour                                    |

---

### 3.11 PUT /api/admin/categories/:id — Update Category

Updates an existing category's name, slug, or description.

**Method:** PUT

**Authentication:** Bearer token required

#### Request Body (JSON)

| Parameter   | Type   | Required | Description           |
| ----------- | ------ | -------- | --------------------- |
| name        | string | No       | Updated category name |
| slug        | string | No       | Updated slug          |
| description | string | No       | Updated description   |

#### Example Request

```bash
curl -X PUT "http://localhost:3001/api/admin/categories/d4e5..." \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sports & Athletics"}'
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "id": "d4e5f6a7-...",
    "name": "Sports & Athletics",
    "slug": "sports-athletics",
    "message": "Category updated successfully"
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                    |
| ----------- | ----------------- | ------------------------------ |
| 400         | INVALID_PARAMETER | Slug already exists            |
| 401         | E010              | Missing or invalid admin token |
| 404         | NOT_FOUND         | Category not found             |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour  |

---

### 3.12 DELETE /api/admin/categories/:id — Delete Category

Deletes a category. If articles are assigned to this category, the request is rejected unless `reassign_to` is specified.

**Method:** DELETE

**Authentication:** Bearer token required

#### Query Parameters

| Parameter   | Type   | Required | Default | Description                           |
| ----------- | ------ | -------- | ------- | ------------------------------------- |
| reassign_to | string | No       | none    | Category UUID to reassign articles to |

#### Example Request

```bash
curl -X DELETE "http://localhost:3001/api/admin/categories/d4e5...?reassign_to=b2c3..." \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

**Success:**

```json
{
  "status": "ok",
  "data": {
    "deleted": true,
    "deleted_id": "d4e5f6a7-...",
    "reassigned_to": "b2c3d4e5-...",
    "articles_reassigned": 34,
    "message": "Category deleted and 34 articles reassigned"
  }
}
```

**Error (category in use, no reassignment):**

```json
{
  "status": "error",
  "error": {
    "code": "E009",
    "message": "Category is in use by 34 articles. Use reassign_to to reassign before deleting."
  }
}
```

#### Error Responses

| HTTP Status | Error Code | Description                                  |
| ----------- | ---------- | -------------------------------------------- |
| 400         | E009       | Category in use and no reassign_to specified |
| 401         | E010       | Missing or invalid admin token               |
| 404         | NOT_FOUND  | Category or reassign_to target not found     |
| 429         | RATE_LIMIT | Exceeded 20 requests per hour                |

---

### 3.13 GET /api/admin/analytics — Time-Series Analytics

Returns aggregated page view data over a date range, grouped by day, week, or month.

**Method:** GET

**Authentication:** Bearer token required

#### Query Parameters

| Parameter   | Type   | Required | Default     | Validation                   | Description         |
| ----------- | ------ | -------- | ----------- | ---------------------------- | ------------------- |
| start_date  | string | No       | 30 days ago | ISO date (YYYY-MM-DD)        | Start of date range |
| end_date    | string | No       | today       | ISO date (YYYY-MM-DD)        | End of date range   |
| granularity | string | No       | day         | `"day"`, `"week"`, `"month"` | Aggregation period  |
| category_id | string | No       | all         | Valid UUID                   | Filter by category  |

#### Example Request

```bash
curl "http://localhost:3001/api/admin/analytics?start_date=2026-05-01&end_date=2026-06-19&granularity=week" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "status": "ok",
  "data": {
    "granularity": "week",
    "start_date": "2026-05-01",
    "end_date": "2026-06-19",
    "points": [
      {
        "period": "2026-05-04",
        "pageviews": 18500,
        "unique_visitors": 8200,
        "avg_time_on_page": 142,
        "article_count": 14
      },
      {
        "period": "2026-05-11",
        "pageviews": 19200,
        "unique_visitors": 8500,
        "avg_time_on_page": 148,
        "article_count": 12
      }
    ],
    "summary": {
      "total_pageviews": 112400,
      "avg_daily_pageviews": 2248,
      "avg_time_on_page": 145,
      "top_article_id": "a1b2c3d4-...",
      "top_article_views": 8500
    }
  }
}
```

#### Error Responses

| HTTP Status | Error Code        | Description                        |
| ----------- | ----------------- | ---------------------------------- |
| 400         | INVALID_PARAMETER | Invalid date format or granularity |
| 401         | E010              | Missing or invalid admin token     |
| 429         | RATE_LIMIT        | Exceeded 50 requests per hour      |

---

### 3.14 GET /api/admin/settings — Get Site Settings

Returns all current site-wide settings (ad codes, header/body HTML). Requires admin bearer token.

**Method:** GET

**Authentication:** Bearer token required

**Rate Limit:** 100/hour, 10/minute burst

#### Example Request

```bash
curl "http://localhost:3001/api/admin/settings" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

#### Response Schema

```json
{
  "success": true,
  "data": {
    "head_html": "<!-- Google Analytics --><script>...</script>",
    "body_html": "<!-- Cookie banner --><div id=\"cookie-banner\">...</div>",
    "ad_header_banner": "",
    "ad_sidebar_1": "",
    "ad_sidebar_2": "",
    "ad_article_sidebar": "",
    "ad_in_article_1": "",
    "ad_in_article_2": ""
  },
  "timestamp": "2026-06-23T12:00:00Z"
}
```

#### Error Responses

| HTTP Status | Error Code | Description                    |
| ----------- | ---------- | ------------------------------ |
| 401         | E010       | Missing or invalid admin token |
| 429         | RATE_LIMIT | Exceeded 100 requests per hour |
| 500         | INTERNAL_ERROR | Database read failure     |

---

### 3.15 PUT /api/admin/settings — Update Site Settings

Updates one or more site-wide settings values. Supports partial updates — only provided keys are changed.

**Method:** PUT

**Authentication:** Bearer token required

**Rate Limit:** 100/hour, 10/minute burst

#### Request Body (JSON)

| Parameter         | Type   | Required | Description                             |
| ----------------- | ------ | -------- | --------------------------------------- |
| head_html         | string | No       | HTML injected into `<head>`             |
| body_html         | string | No       | HTML injected after `<body>`            |
| ad_header_banner  | string | No       | 728x90 header banner ad code            |
| ad_sidebar_1      | string | No       | 300x250 sidebar middle ad code          |
| ad_sidebar_2      | string | No       | 300x250 sidebar bottom ad code          |
| ad_article_sidebar | string | No       | 300x250 article sidebar ad code         |
| ad_in_article_1   | string | No       | 300x250 in-article (position 1) ad code |
| ad_in_article_2   | string | No       | 300x250 in-article (position 2) ad code |

#### Example Request

```bash
curl -X PUT "http://localhost:3001/api/admin/settings" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ad_header_banner": "<ins class=\"adsbygoogle\">...</ins>"}'
```

#### Response Schema

```json
{
  "success": true,
  "data": {
    "head_html": "",
    "body_html": "",
    "ad_header_banner": "<ins class=\"adsbygoogle\">...</ins>",
    "ad_sidebar_1": "",
    "ad_sidebar_2": "",
    "ad_article_sidebar": "",
    "ad_in_article_1": "",
    "ad_in_article_2": ""
  },
  "message": "Settings updated successfully",
  "timestamp": "2026-06-23T12:00:00Z"
}
```

#### Cache Behavior

Updating settings invalidates the public `GET /api/settings` response cache, ensuring the frontend picks up changes within the next 5-minute cache window.

#### Error Responses

| HTTP Status | Error Code        | Description                    |
| ----------- | ----------------- | ------------------------------ |
| 400         | INVALID_PARAMETER | No valid setting keys provided |
| 401         | E010              | Missing or invalid admin token |
| 429         | RATE_LIMIT        | Exceeded 100 requests per hour |
| 500         | INTERNAL_ERROR    | Database write failure         |

---

## 4. Service Interfaces

All services reside in `backend/src/services/`. They are not directly exposed to the web; they are used by cron jobs and route handlers.

### TrendFinder (trendMonitor, article generation)

- `discover(category: string, geos: string[]): Trend[]`
- `filterByRecency(trends: Trend[], hours: number): Trend[]`
- `calculateScore(trend: Trend, weights?: object): number`
- `getTopTopics(limit?: number, category?: string): Trend[]`

### KeywordMatrix (keywordRefresh, article generation)

- `generateFromHeadTerm(headTerm: string, category: string): Keyword[]`
- `validateWithSerpAPI(keywords: Keyword[]): Keyword[]`
- `scoreAndRank(keywords: Keyword[]): Keyword[]`
- `getWinningKeyword(trendData: object): Keyword`
- `getPendingKeywords(limit?: number): Keyword[]`
- `updateStatus(keywordId: string, status: string): boolean`
- `pruneOldEntries(days?: number): number`

### ContentGuide (article generation)

- `generate(keyword: string, trendData: object): ContentGuide`
- `extractSubheadings(serpResults: object[]): string[]`
- `identifyContentGaps(competitorData: object[]): string[]`
- `determineNarrativeAngle(newsData: object[], trendData: object): string`
- `validateGuide(guide: object): boolean`

### GroqWriter (article generation)

- `generateArticle(contentGuide: object): Article`
- `validateOutput(json: string): boolean`
- `fixMalformedJson(raw: string): string`

### SEOOptimizer

- `optimizeTitle(keyword: string, category: string, intent: string): string`
- `generateMetaDescription(keyword: string, content: string, maxLength?: number): string`
- `validateHeadings(blocks: ContentBlock[]): boolean`
- `checkKeywordDensity(content: string, keyword: string): number`
- `generateUrlSlug(title: string): string`

### SchemaBuilder

- `detectSchemaType(content: object): string`
- `buildArticleSchema(data: object): object`
- `buildFAQSchema(faqList: object[]): object`
- `buildBreadcrumbSchema(crumbs: object[]): object`
- `validateSchema(schema: object): boolean`

### SitemapManager

- `generateSitemapIndex(): string`
- `generateArticleSitemap(page?: number, perPage?: number): string`
- `generateStaticSitemap(): string`
- `pingSearchEngines(): void`

### RSSFeed

- `generateFeed(limit?: number, category?: string): string`
- `getChannelData(): object`
- `getItemData(article: object): object`

### LinkManager

- `findInternalLinkOpportunities(content: string, existingArticles: object[]): object[]`
- `insertInternalLinks(content: string, links: object[]): string`
- `addExternalCitations(content: string, sources: object[]): string`
- `updateArticleGraph(sourceSlug: string, links: object[]): void`
- `rebuildLinkGraph(): void`
- `checkBrokenLinks(): object[]`

### Publisher

- `publish(articleData: object): object`
- `generateHtml(article: object): string`
- `writeCache(slug: string, html: string): boolean`
- `qualityCheck(article: object): boolean`

### ImageHandler

- `generateFeaturedImage(title: string, category: string, suggestions?: string[]): string`
- `optimizeToWebP(sourcePath: string): string`
- `getImageUrl(slug: string, format?: string): string`

### TextAnalyzer

- `checkReadability(text: string): { score: number, level: string }`
- `checkBannedPhrases(text: string): { found: string[], count: number }`
- `checkDuplicate(text: string, existing: string[]): { similarity: number, verdict: string }`
- `analyzeSentiment(text: string): { polarity: number, subjectivity: number }`
- `calculateKeywordDensity(text: string, keyword: string): number`

### SERPTracker

- `getPosition(domain: string, keyword: string): number`
- `updateMetrics(articleId: string): void`

### Notification

- `sendAlert(severity: string, message: string, channel?: string): void`
- `sendWebhook(payload: object): void`

### ContentRefresher

- `identifyStaleArticles(daysOld?: number): Article[]`
- `generateRefreshGuide(article: Article): ContentGuide`
- `updateArticle(article: Article, guide: ContentGuide): Article`
- `preserveSEOValue(oldArticle: Article, updatedArticle: Article): void`

### MetricsCollector

- `trackPageview(slug: string, ip: string, userAgent: string): void`
- `getArticleStats(slug: string): object`
- `updateFromGoogleSearchConsole(data: object[]): void`

### AdminService (dashboard, article admin)

- `getDashboardStats(): DashboardStats`
- `getArticles(filters: ArticleFilters): PaginatedResult<Article>`
- `getArticleById(id: string): ArticleDetail`
- `updateArticle(id: string, data: UpdateData): Article`
- `deleteArticle(id: string, permanent?: boolean): void`

### CategoryService (category management)

- `getAll(): Category[]`
- `getById(id: string): Category`
- `create(data: CreateCategory): Category`
- `update(id: string, data: UpdateCategory): Category`
- `delete(id: string, reassignToId?: string): { deleted: boolean; reassigned: number }`

### LinkService (article link management)

- `addLink(articleId: string, data: AddLink): LinkGraph`
- `removeLink(articleId: string, linkId: string): boolean`
- `getArticleLinks(articleId: string): LinkGraph[]`
- `syncLinkGraph(articleId: string): void`

### AnalyticsService (page view tracking)

- `trackPageview(articleId: string, ref?: string): void`
- `getTimeSeries(options: AnalyticsQuery): AnalyticsData`
- `getArticleAnalytics(articleId: string): ArticleAnalytics`
- `getTopArticles(period: string, limit?: number): Article[]`

### SiteSettingsService (site configuration)

- `getAllSettings(): Record<string, string>`
- `updateSettings(settings: Record<string, string>): Record<string, string>`

---

## 5. Error Codes Reference

### HTTP Status Code Errors

| Error Code          | HTTP Status | Description                           | Typical Cause                      |
| ------------------- | ----------- | ------------------------------------- | ---------------------------------- |
| MISSING_PARAMETER   | 400         | A required parameter was not provided | Missing action, keyword, or slug   |
| INVALID_PARAMETER   | 400         | A parameter value is invalid          | Wrong category, out-of-range limit |
| UNAUTHORIZED        | 401         | Authentication failed                 | Missing or invalid token           |
| FORBIDDEN           | 403         | Request blocked                       | IP on blocklist                    |
| NOT_FOUND           | 404         | Resource not found                    | Invalid slug, empty result set     |
| RATE_LIMIT          | 429         | Too many requests per hour            | Exceeded endpoint rate limit       |
| INTERNAL_ERROR      | 500         | Unexpected server error               | Node.js exception, config error    |
| BAD_GATEWAY         | 502         | Upstream API failure                  | SerpAPI or Groq returning errors   |
| SERVICE_UNAVAILABLE | 503         | Critical service unavailable          | Database connection lost           |
| GATEWAY_TIMEOUT     | 504         | Groq API timeout                      | Generation exceeded 60 seconds     |

### Internal Processing Error Codes

| Error Code | HTTP Status | Description                  | Likely Cause                                       |
| ---------- | ----------- | ---------------------------- | -------------------------------------------------- |
| E001       | 502         | SerpAPI rate limit reached   | Exceeded plan quota                                |
| E002       | 502         | SerpAPI empty results        | No data found for the query                        |
| E003       | 504         | Groq API timeout             | Generation exceeded 60 seconds                     |
| E004       | 500         | Content quality gate failed  | Banned phrases, low word count                     |
| E005       | 500         | Duplicate article detected   | Similarity >85% with existing article              |
| E006       | 400         | Keyword difficulty too high  | Difficulty >50 at generation time                  |
| E007       | 500         | Insufficient data points     | Content guide has <2 data points                   |
| E008       | 500         | Database write failure       | Prisma connection or constraint violation          |
| E009       | 400         | Category in use              | Category has articles and no reassign_to specified |
| E010       | 401         | Admin authentication failure | Missing or invalid admin bearer token              |
| E011       | 500         | PageView insert failure      | Page tracking upsert failed                        |

---

## 6. Error Handling

All errors are logged to `system_logs` with severity levels (`info`, `warning`, `error`, `critical`). The system follows these error handling principles:

- **11 internal error codes** (E001-E011) categorize known failure modes
- **Exponential backoff retry** for transient external API failures (SerpAPI, Groq) with configurable retry count (default: 3)
- **Fallback to cached data** when live data is unavailable but a cached copy exists
- **Quality gates** prevent low-quality content from being published
- **Duplicate detection** checks semantic similarity (>85%) before publishing
- **Admin notifications** triggered for critical failures (E001, E003, E008)

Error responses include a JSON body with this structure:

```json
{
  "error": true,
  "code": "E004",
  "message": "Generated content failed quality gate: Insufficient data points",
  "retry_after": null
}
```

For rate-limited requests, the `Retry-After` header is set to seconds until the limit resets.
