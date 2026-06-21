# Database — GameDayWire

Prisma ORM schema documentation for all 7 database models, including columns, types, constraints, relationships, indexes, and migration workflow.

---

## Database Technology

The system uses **SQLite** via Prisma ORM for development and small-scale production deployments. SQLite provides:

- **Zero configuration** — no database server to install or manage
- **File-based storage** — the entire database is a single file (`backend/prisma/dev.db`)
- **Portability** — the database travels with your codebase
- **Performance** — excellent for single-server deployments

For larger deployments, the Prisma schema can be switched to PostgreSQL by changing the `provider` in `schema.prisma` from `"sqlite"` to `"postgresql"` and running the migration.

---

## Schema Overview (9 Models)

| Model             | Table              | Purpose                                                                |
| ----------------- | ------------------ | ---------------------------------------------------------------------- |
| `Category`        | categories         | Content categories with unique slugs (e.g. Sports, Entertainment, NBA) |
| `Trend`           | trends             | Stores trending search queries discovered by trendMonitor              |
| `Keyword`         | keywords           | The Living Keyword Matrix — keyword combinations with scores           |
| `Article`         | articles           | Primary content table — every published article                        |
| `ArticleCategory` | article_categories | Many-to-many join table linking articles to categories                 |
| `PageView`        | page_views         | Daily-aggregated page view analytics per article                       |
| `SeoMetric`       | seo_metrics        | SEO performance tracking over time                                     |
| `LinkGraph`       | link_graph         | Internal/external link records                                         |
| `ContentGuide`    | content_guides     | Content Guide archives for audit trail                                 |
| `SystemLog`       | system_logs        | Centralized logging for all system events                              |

---

## Model: Category

Content categories for articles, trends, and keywords. Categories are a full database model with a many-to-many relationship to articles via the `ArticleCategory` join table.

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
```

### Column Details

| Column      | Type     | Constraints      | Description                           |
| ----------- | -------- | ---------------- | ------------------------------------- |
| id          | UUID     | PRIMARY KEY      | Unique identifier                     |
| name        | TEXT     | NOT NULL         | Display name (e.g., "Sports", "NBA")  |
| slug        | TEXT     | UNIQUE, NOT NULL | URL-friendly identifier (e.g., "nba") |
| description | TEXT     | DEFAULT ''       | Optional category description         |
| createdAt   | DATETIME | DEFAULT now()    | Creation timestamp                    |
| updatedAt   | DATETIME | Auto             | Last modification timestamp           |

### Migration Note

The `category` string field on `Trend` and `Keyword` is replaced by a `categoryId` foreign key to this table. Existing trends and keywords without a category should be assigned to a "General" or default category during migration.

**Seed Categories:**

- **Sports** (slug: `sports`) — Primary sports category
- **Entertainment** (slug: `entertainment`) — Primary entertainment category

Additional sub-categories can be created via the admin panel (e.g., "NBA", "NFL", "Movies", "Streaming").

---

## Model: Trend

Stores trending search queries discovered by the `TrendFinder` service.

```prisma
model Trend {
  id              String   @id @default(uuid())
  query           String
  normalizedQuery String
  categoryId      String?  // FK → categories(id)
  searchVolume    Int      @default(0)
  growthRate      Float    @default(0)
  geo             String
  relatedQueries  String   @default("[]")  // JSON array
  fetchedAt       DateTime @default(now())
  processed       Boolean  @default(false)
  articleId       String?  @unique
  trendScore      Float    @default(0)

  article         Article? @relation(fields: [articleId], references: [id])
  category        Category? @relation(fields: [categoryId], references: [id])

  @@index([categoryId])
  @@index([fetchedAt(sort: Desc)])
  @@index([trendScore(sort: Desc)])
  @@map("trends")
}
```

### Column Details

| Column          | Type     | Constraints                   | Description                                   |
| --------------- | -------- | ----------------------------- | --------------------------------------------- |
| id              | UUID     | PRIMARY KEY                   | Unique identifier                             |
| query           | TEXT     | NOT NULL                      | Raw trending query from SerpAPI               |
| normalizedQuery | TEXT     | NOT NULL                      | Cleaned version for matching                  |
| categoryId      | TEXT     | NULLABLE, FK → categories(id) | Content category (optional FK reference)      |
| searchVolume    | INTEGER  | DEFAULT 0                     | Estimated monthly volume                      |
| growthRate      | FLOAT    | DEFAULT 0                     | Percentage increase                           |
| geo             | TEXT     | NOT NULL                      | Country code (US, GB, CA, AU, IE, NZ, ZA, IN) |
| relatedQueries  | JSON     | DEFAULT '[]'                  | SerpAPI related_searches                      |
| fetchedAt       | DATETIME | DEFAULT now()                 | Discovery timestamp                           |
| processed       | BOOLEAN  | DEFAULT false                 | Whether used for article generation           |
| articleId       | UUID     | UNIQUE, NULLABLE              | Linked article if processed                   |
| trendScore      | FLOAT    | DEFAULT 0                     | Calculated composite score                    |

---

## Model: Keyword

The Living Keyword Matrix — keyword combinations with scores.

```prisma
model Keyword {
  id              String   @id @default(uuid())
  keyword         String   @unique
  headTerm        String
  modifier        String
  searchVolume    Int      @default(0)
  difficulty      Int      @default(100)
  cpc             Float    @default(0)
  intent          String   // 'informational' | 'commercial' | 'navigational' | 'transactional' | 'news'
  categoryId      String?  // FK → categories(id)
  priorityScore   Float    @default(0)
  serpFeatures    String   @default("[]")  // JSON array
  status          String   @default("pending")  // 'pending' | 'approved' | 'rejected' | 'used' | 'refresh'
  createdAt       DateTime @default(now())
  lastValidatedAt DateTime?
  timesTargeted   Int      @default(0)

  category        Category? @relation(fields: [categoryId], references: [id])
  articles        Article[]
  contentGuides   ContentGuide[]

  @@index([status, priorityScore(sort: Desc)])
  @@index([categoryId])
  @@index([headTerm])
  @@map("keywords")
}
```

### Column Details

| Column          | Type     | Constraints                   | Description                              |
| --------------- | -------- | ----------------------------- | ---------------------------------------- |
| id              | UUID     | PRIMARY KEY                   | Unique identifier                        |
| keyword         | TEXT     | UNIQUE, NOT NULL              | Full keyword phrase                      |
| headTerm        | TEXT     | NOT NULL                      | Core subject (e.g., "LeBron James")      |
| modifier        | TEXT     | NOT NULL                      | Descriptive addition (e.g., "stats")     |
| searchVolume    | INTEGER  | DEFAULT 0                     | Monthly searches from SerpAPI            |
| difficulty      | INTEGER  | DEFAULT 100                   | 0-100, lower is better                   |
| cpc             | FLOAT    | DEFAULT 0                     | Cost per click in USD                    |
| intent          | TEXT     | NOT NULL                      | Search intent                            |
| categoryId      | TEXT     | NULLABLE, FK → categories(id) | Content category (optional FK reference) |
| priorityScore   | FLOAT    | DEFAULT 0                     | Calculated ranking                       |
| serpFeatures    | JSON     | DEFAULT '[]'                  | Available SERP features                  |
| status          | TEXT     | DEFAULT 'pending'             | Lifecycle status                         |
| createdAt       | DATETIME | DEFAULT now()                 | Discovery date                           |
| lastValidatedAt | DATETIME | NULLABLE                      | Last SerpAPI validation                  |
| timesTargeted   | INTEGER  | DEFAULT 0                     | How many articles used this keyword      |

**Priority Score Formula:**

```
Priority = (searchVolume / nullif(difficulty, 0)) * intentMultiplier

Intent Multipliers:
- informational: 1.0
- commercial: 1.5
- transactional: 2.0
- news: 1.3
- navigational: 0.5
```

---

## Model: Article

Primary content table — every published article.

```prisma
model Article {
  id              String   @id @default(uuid())
  slug            String   @unique
  title           String
  metaDescription String
  h1              String
  contentHtml     String
  contentBlocks   String   // JSON
  keywordId       String?
  trendId         String?
  wordCount       Int
  readingLevel    Float
  schemaMarkup    String   // JSON
  internalLinks   String   @default("[]")  // JSON
  externalLinks   String   @default("[]")  // JSON
  status          String   @default("draft")  // 'draft' | 'published' | 'indexed' | 'updated' | 'failed' | 'archived'
  generationAttempts Int   @default(1)
  qualityScore    Float    @default(0)
  publishedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastRefreshedAt DateTime?
  pageviews       Int      @default(0)
  avgTimeOnPage   Int      @default(0)
  bounceRate      Float    @default(0)
  googlePosition  Int      @default(0)

  keyword         Keyword?  @relation(fields: [keywordId], references: [id])
  trend           Trend?    @relation(fields: [trendId], references: [id])
  pageViews       PageView[]
  categories      ArticleCategory[]
  seoMetrics      SeoMetric[]
  contentGuide    ContentGuide[]

  @@index([status, publishedAt(sort: Desc)])
  @@index([slug])
  @@index([keywordId])
  @@index([trendId])
  @@map("articles")
}
```

### Column Details

| Column             | Type     | Constraints        | Description              |
| ------------------ | -------- | ------------------ | ------------------------ |
| id                 | UUID     | PRIMARY KEY        | Unique identifier        |
| slug               | TEXT     | UNIQUE, NOT NULL   | URL-friendly identifier  |
| title              | TEXT     | NOT NULL           | SEO-optimized title tag  |
| metaDescription    | TEXT     | NOT NULL           | 150-160 character meta   |
| h1                 | TEXT     | NOT NULL           | Page H1 heading          |
| contentHtml        | TEXT     | NOT NULL           | Full rendered HTML       |
| contentBlocks      | JSON     | NOT NULL           | Structured content array |
| keywordId          | UUID     | FK -> keywords(id) | Target keyword           |
| trendId            | UUID     | FK -> trends(id)   | Source trend             |
| wordCount          | INTEGER  | NOT NULL           | Total words              |
| readingLevel       | FLOAT    | NOT NULL           | Flesch-Kincaid score     |
| schemaMarkup       | JSON     | NOT NULL           | JSON-LD structured data  |
| internalLinks      | JSON     | DEFAULT '[]'       | Array of link objects    |
| externalLinks      | JSON     | DEFAULT '[]'       | Array of link objects    |
| status             | TEXT     | DEFAULT 'draft'    | Publication status       |
| generationAttempts | INTEGER  | DEFAULT 1          | Number of Groq attempts  |
| qualityScore       | FLOAT    | DEFAULT 0          | Internal quality rating  |
| publishedAt        | DATETIME | NULLABLE           | Live date                |
| updatedAt          | DATETIME | Auto               | Last modification        |
| lastRefreshedAt    | DATETIME | NULLABLE           | Last content update      |
| pageviews          | INTEGER  | DEFAULT 0          | Traffic count            |
| avgTimeOnPage      | INTEGER  | DEFAULT 0          | Engagement in seconds    |
| bounceRate         | FLOAT    | DEFAULT 0          | Percentage               |
| googlePosition     | INTEGER  | DEFAULT 0          | Current SERP position    |

---

## Model: ArticleCategory

Many-to-many join table linking articles to categories. Allows articles to belong to multiple categories simultaneously, with referential integrity on both sides.

```prisma
model ArticleCategory {
  articleId  String
  categoryId String

  article  Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@id([articleId, categoryId])
  @@map("article_categories")
}
```

### Column Details

| Column     | Type | Constraints                                | Description     |
| ---------- | ---- | ------------------------------------------ | --------------- |
| articleId  | UUID | PK, FK → articles(id) ON DELETE CASCADE    | Linked article  |
| categoryId | UUID | PK, FK → categories(id) ON DELETE RESTRICT | Linked category |

**Key Constraints:**

- `@@id([articleId, categoryId])` — Composite primary key prevents duplicate assignments
- `onDelete: Cascade` on article — Removing an article auto-cleans its category assignments
- `onDelete: Restrict` on category — Prevents deleting a category that still has assigned articles (must reassign first)

---

## Model: PageView

Daily-aggregated page view analytics per article. Designed for efficient time-series queries without storing individual page view events.

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

### Column Details

| Column         | Type     | Constraints                 | Description                                    |
| -------------- | -------- | --------------------------- | ---------------------------------------------- |
| id             | UUID     | PRIMARY KEY                 | Unique identifier                              |
| articleId      | UUID     | FK → articles(id), NOT NULL | Linked article                                 |
| date           | DATETIME | NOT NULL                    | Calendar date (stored as midnight UTC)         |
| pageviews      | INTEGER  | DEFAULT 0                   | Total page views for this article on this date |
| uniqueVisitors | INTEGER  | DEFAULT 0                   | Estimated unique visitors for this date        |
| avgTimeOnPage  | INTEGER  | DEFAULT 0                   | Average time on page in seconds                |
| createdAt      | DATETIME | DEFAULT now()               | Row creation timestamp                         |
| updatedAt      | DATETIME | Auto                        | Last update timestamp                          |

**Unique Constraint:** `@@unique([articleId, date])` enables upsert semantics — on each page view, the system upserts the row for today, incrementing the `pageviews` counter.

**Relationship:** The `Article.pageviews` field is a denormalized lifetime counter synced from `SUM(PageView.pageviews)` via a cron job or on-the-fly aggregation.

---

## Model: SeoMetric

SEO performance tracking over time.

```prisma
model SeoMetric {
  id            String   @id @default(uuid())
  articleId     String
  googlePosition Int     @default(0)
  impressions   Int      @default(0)
  clicks        Int      @default(0)
  ctr           Float    @default(0)
  avgPosition   Float    @default(0)
  topQueries    String   @default("[]")  // JSON
  trackedAt     DateTime @default(now())

  article       Article  @relation(fields: [articleId], references: [id])

  @@index([articleId, trackedAt(sort: Desc)])
  @@map("seo_metrics")
}
```

### Column Details

| Column         | Type     | Constraints                  | Description                      |
| -------------- | -------- | ---------------------------- | -------------------------------- |
| id             | UUID     | PRIMARY KEY                  | Unique identifier                |
| articleId      | UUID     | FK -> articles(id), NOT NULL | Linked article                   |
| googlePosition | INTEGER  | DEFAULT 0                    | SERP ranking for primary keyword |
| impressions    | INTEGER  | DEFAULT 0                    | Search impressions               |
| clicks         | INTEGER  | DEFAULT 0                    | Organic clicks                   |
| ctr            | FLOAT    | DEFAULT 0                    | Click-through rate               |
| avgPosition    | FLOAT    | DEFAULT 0                    | Average position across queries  |
| topQueries     | JSON     | DEFAULT '[]'                 | Top 5 queries driving traffic    |
| trackedAt      | DATETIME | DEFAULT now()                | Measurement date                 |

---

## Model: LinkGraph

Internal/external link records between articles.

```prisma
model LinkGraph {
  id             String   @id @default(uuid())
  sourceSlug     String
  targetSlug     String
  anchorText     String
  linkType       String   // 'internal' | 'external'
  contextSnippet String
  articleId      String?  // FK → articles(id) for admin link management
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  article        Article? @relation(fields: [articleId], references: [id])

  @@index([sourceSlug])
  @@index([targetSlug])
  @@index([linkType])
  @@index([articleId])
  @@map("link_graph")
}
```

### Column Details

| Column         | Type     | Constraints                 | Description                                      |
| -------------- | -------- | --------------------------- | ------------------------------------------------ |
| id             | UUID     | PRIMARY KEY                 | Unique identifier                                |
| sourceSlug     | TEXT     | NOT NULL                    | Linking article slug                             |
| targetSlug     | TEXT     | NOT NULL                    | Linked article slug                              |
| anchorText     | TEXT     | NOT NULL                    | Clickable text                                   |
| linkType       | TEXT     | NOT NULL                    | internal or external                             |
| contextSnippet | TEXT     | NOT NULL                    | Surrounding text for relevance                   |
| articleId      | UUID     | NULLABLE, FK → articles(id) | Direct reference to article for admin management |
| createdAt      | DATETIME | DEFAULT now()               | When link added                                  |
| updatedAt      | DATETIME | Auto                        | Last verification                                |

---

## Model: ContentGuide

Content Guide archives for audit trail.

```prisma
model ContentGuide {
  id              String   @id @default(uuid())
  articleId       String?  @unique
  keywordId       String
  guideData       String   // JSON
  serpData        String   // JSON
  narrativeAngle  String
  dataPointsCount Int      @default(0)
  contentGaps     String   @default("[]")  // JSON
  createdAt       DateTime @default(now())

  article         Article? @relation(fields: [articleId], references: [id])
  keyword         Keyword  @relation(fields: [keywordId], references: [id])

  @@map("content_guides")
}
```

### Column Details

| Column          | Type     | Constraints                          | Description                          |
| --------------- | -------- | ------------------------------------ | ------------------------------------ |
| id              | UUID     | PRIMARY KEY                          | Unique identifier                    |
| articleId       | UUID     | FK -> articles(id), UNIQUE, NULLABLE | Linked article                       |
| keywordId       | UUID     | FK -> keywords(id), NOT NULL         | Target keyword                       |
| guideData       | JSON     | NOT NULL                             | Full content guide structure         |
| serpData        | JSON     | NOT NULL                             | Raw SerpAPI data used                |
| narrativeAngle  | TEXT     | NOT NULL                             | Determined story angle               |
| dataPointsCount | INTEGER  | DEFAULT 0                            | Number of statistics/quotes included |
| contentGaps     | JSON     | DEFAULT '[]'                         | Identified competitor gaps           |
| createdAt       | DATETIME | DEFAULT now()                        | Generation timestamp                 |

---

## Model: SystemLog

Centralized logging for all system events.

```prisma
model SystemLog {
  id        String   @id @default(uuid())
  logType   String   // 'generation' | 'publish' | 'error' | 'audit' | 'refresh'
  message   String
  metadata  String   @default("{}")  // JSON
  severity  String   // 'info' | 'warning' | 'error' | 'critical'
  createdAt DateTime @default(now())

  @@map("system_logs")
}
```

### Column Details

| Column    | Type     | Constraints   | Description        |
| --------- | -------- | ------------- | ------------------ |
| id        | UUID     | PRIMARY KEY   | Unique identifier  |
| logType   | TEXT     | NOT NULL      | Event type         |
| message   | TEXT     | NOT NULL      | Log message        |
| metadata  | JSON     | DEFAULT '{}'  | Additional context |
| severity  | TEXT     | NOT NULL      | Importance level   |
| createdAt | DATETIME | DEFAULT now() | Event timestamp    |

---

## Migration Workflow

### Creating a New Migration (Development)

```bash
npx prisma migrate dev --name description_of_change
```

### Applying Migrations to Production

```bash
npx prisma migrate deploy
```

### Resetting the Database (Development Only)

```bash
npx prisma migrate reset
```

This drops all data and re-applies migrations. Never run this in production.

### Generating Prisma Client

The Prisma client is auto-generated during `pnpm install` and after each migration:

```bash
npx prisma generate
```

---

## Seed Data

The seed script populates:

- Initial head terms and modifiers to bootstrap the KeywordMatrix
- Initial categories: **Sports** (slug: `sports`) and **Entertainment** (slug: `entertainment`)
- Initial category and tag structures for navigation

Head terms include:

- Major sports leagues: NBA, NFL, Premier League, MLB, NHL
- Prominent athletes: LeBron James, Patrick Mahomes, Cristiano Ronaldo
- Entertainment franchises: Marvel, Netflix, Taylor Swift, Oscars
- Broad categories: streaming services, sports betting, fantasy sports

The seed script is idempotent — running it multiple times will not create duplicate entries.

```bash
pnpm seed
```

---

## Indexes Summary

| Table              | Index                           | Columns                       | Purpose                        |
| ------------------ | ------------------------------- | ----------------------------- | ------------------------------ |
| categories         | idx_categories_slug             | (slug)                        | Unique lookup by URL slug      |
| trends             | idx_trends_category             | (categoryId)                  | Filter by category             |
| trends             | idx_trends_fetched_at           | (fetched_at DESC)             | Sort by discovery time         |
| trends             | idx_trends_trend_score          | (trend_score DESC)            | Sort by score                  |
| keywords           | idx_keywords_status_priority    | (status, priority_score DESC) | Get top approved keywords      |
| keywords           | idx_keywords_category           | (categoryId)                  | Filter by category             |
| keywords           | idx_keywords_head_term          | (headTerm)                    | Lookup by head term            |
| articles           | idx_articles_status_published   | (status, published_at DESC)   | List published articles        |
| articles           | idx_articles_slug               | (slug)                        | Lookup by URL slug             |
| articles           | idx_articles_keyword_id         | (keywordId)                   | Join with keywords             |
| articles           | idx_articles_trend_id           | (trendId)                     | Join with trends               |
| article_categories | idx_article_categories_article  | (articleId)                   | Find categories for an article |
| article_categories | idx_article_categories_category | (categoryId)                  | Find articles in a category    |
| page_views         | idx_page_views_date             | (date DESC)                   | Time-series queries by date    |
| page_views         | idx_page_views_article_date     | (articleId, date DESC)        | Per-article time-series        |
| seo_metrics        | idx_seo_metrics_article_date    | (articleId, tracked_at DESC)  | Time-series by article         |
| link_graph         | idx_link_graph_source           | (sourceSlug)                  | Find outgoing links            |
| link_graph         | idx_link_graph_target           | (targetSlug)                  | Find incoming links            |
| link_graph         | idx_link_graph_type             | (linkType)                    | Filter by type                 |
| link_graph         | idx_link_graph_article          | (articleId)                   | Find all links for an article  |

---

## Switching to PostgreSQL

To switch from SQLite to PostgreSQL, change the Prisma schema provider:

```prisma
// In schema.prisma
datasource db {
  provider = "postgresql"  // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then set your connection string in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

Run the migration:

```bash
npx prisma migrate dev --name init
```
