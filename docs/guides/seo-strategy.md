# SEO Strategy — GameDayWire

Title formulas, schema markup, intelligent linking, geo-detection, and monetization strategy powering the programmatic SEO system.

---

## 1. Title Formula Engine

**Service:** `TitleEngine.ts`

The title is constructed using a Title Formula Engine with strict rules:

### Title Rules

- Primary keyword appears within the first 60 characters
- Power words included (Ultimate, Complete, Essential, Proven, Updated, Exclusive)
- Year or recency indicator (2026, Latest, Today, This Week, Breaking)
- Number if listicle format applicable (Top 5, 7 Best, 10 Reasons)
- Brand name at the end (separated by pipe or dash)
- Total length: 50-60 characters (optimal for SERP display)
- Emotional trigger words where appropriate (Shocking, Surprising, Revealed)

### Title Templates by Intent

| Intent        | Formula                                                   | Example                                                                      |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Informational | `[Number] [Power Word] Ways to [Keyword] in [Year]`       | "7 Proven Ways to Improve Your NBA Fantasy Draft in 2026"                    |
| Commercial    | `[Keyword]: [Power Word] Guide for [Audience] ([Year])`   | "Best Streaming Services for Sports: Complete Guide for Cord-Cutters (2026)" |
| News/Breaking | `[Keyword] [Update/News]: What We Know [Timeframe]`       | "LeBron James Injury Update: What We Know This Week"                         |
| Comparison    | `[Keyword] vs [Rival]: [Power Word] Comparison ([Year])`  | "Lakers vs Celtics 2026: Complete Head-to-Head Breakdown"                    |
| Listicle      | `[Number] [Power Word] [Keyword] You Can't Miss ([Year])` | "10 Best Sports Documentaries on Netflix You Can't Miss (2026)"              |
| How-To        | `How to [Keyword]: [Power Word] Guide ([Year])`           | "How to Watch Premier League in USA: Complete Guide (2026)"                  |

### Title Scoring

Each generated title variation is scored on:

- **Keyword presence within first 60 chars** (+30 points)
- **Power word inclusion** (+10 points per power word, max +30)
- **Year/recency indicator** (+15 points)
- **Character length 50-60** (+15 points)
- **Emotional trigger word** (+10 points)
- **Readability score** (+10 points if Flesch-Kincaid 60-70)

The highest-scoring title is selected. If multiple titles tie, the one with the highest predicted CTR (based on historical data) wins.

---

## 2. Schema Auto-Selection Matrix

**Service:** `SchemaBuilder.ts`

### Schema Types by Content Type

| Content Type                | Schema Types                        | @type Value |
| --------------------------- | ----------------------------------- | ----------- |
| Breaking news               | `NewsArticle` + `BreadcrumbList`    | NewsArticle |
| Player/celebrity profile    | `ProfilePage` + `Person`            | ProfilePage |
| Game/event preview or recap | `SportsEvent` + `FAQPage`           | SportsEvent |
| Movie review                | `Movie` + `Review`                  | Review      |
| Comparison article          | `Article` + `Table` structured data | Article     |
| Listicle                    | `Article` + `ItemList`              | Article     |
| How-to guide                | `HowTo` + `Article`                 | HowTo       |

### Core Schema Properties (Every Article)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "SEO-Optimized Title",
  "description": "Meta description, 150-160 characters",
  "datePublished": "2026-06-19T08:00:00Z",
  "dateModified": "2026-06-19T08:00:00Z",
  "author": {
    "@type": "Organization",
    "name": "GameDayWire"
  },
  "publisher": {
    "@type": "Organization",
    "name": "GameDayWire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yoursite.com/images/logo.svg"
    }
  },
  "image": "https://yoursite.com/images/featured/article-slug.jpg",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://yoursite.com/article/slug/"
  }
}
```

### Schema Validation

All generated schema markup is validated before publishing:

- Valid JSON syntax (no trailing commas, valid escaping)
- Required properties present for each @type
- Property values match expected types (URL, Text, Date, etc.)
- No schema.org validation errors

---

## 3. Intelligent Linking

**Service:** `LinkManager.ts`

### Internal Linking Strategy

The system maintains an Article Graph in the database:

1. **Parse content** for known keywords from existing articles
2. **Match contextually** — first natural occurrence of each matching keyword
3. **Insert links** with contextual anchor text:
   ```html
   <a href="https://yoursite.com/[slug]/">[natural anchor text]</a>
   ```
4. **Limits:** Maximum 5 internal links per article
5. **Link equity distribution:** Articles with low traffic get priority
6. **Anchor text rules:** Natural phrasing, no exact-match stuffing, contextual relevance

### External Linking Strategy

The system does NOT link to competitors. Instead:

**Source Pre-Approval Tier List:**

| Tier          | Sports                                                                                                                     | Entertainment                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Tier 1**    | ESPN, BBC Sport, Sky Sports, The Athletic, Sports Illustrated, official league sites (NBA.com, NFL.com, PremierLeague.com) | Variety, The Hollywood Reporter, Deadline, Entertainment Weekly, Rolling Stone, official studio/artist pages |
| **Tier 2**    | Reuters, AP News, CNN, Fox Sports                                                                                          | TMZ (for breaking news only)                                                                                 |
| **Forbidden** | Competitor blogs, content farms, unverified social media posts                                                             |                                                                                                              |

**External Link Rules:**

- Use `rel="nofollow noopener noreferrer"` for all external links
- Open in new tab (`target="_blank"`)
- Maximum 3 external links per article
- Every external link must support a specific claim, not a generic statement

### Smart Link Insertion Rules

- Never link to a page ranking for the same primary keyword (competitor avoidance)
- Always link to the most recent article on a related subtopic
- First internal link appears within the first 300 words
- External citations must correspond to specific data points or quotes in the article

---

## 4. Geo-Detection Strategy

Content is not geo-locked. The system detects visitor IP and subtly adjusts:

| Element                  | Adjustment                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Currency references**  | USD, GBP, CAD, AUD based on visitor location                                                           |
| **Time zone references** | "kickoff at 3 PM ET / 8 PM GMT" — dual timezone display                                                |
| **Local sports leagues** | NFL for US, Premier League for UK, AFL for Australia                                                   |
| **Publishing times**     | 8 AM UTC captures European morning; 7 PM UTC captures US afternoon/evening and Australian next-morning |

### Publishing Schedule

| Article             | Time (UTC) | Local Equivalents                         |
| ------------------- | ---------- | ----------------------------------------- |
| **Morning Article** | 08:00 UTC  | 3 AM ET / 8 AM GMT / 4 PM AEST            |
| **Evening Article** | 19:00 UTC  | 2 PM ET / 7 PM GMT / 5 AM AEST (next day) |

### Target Markets

| Tier                                    | Countries                                      |
| --------------------------------------- | ---------------------------------------------- |
| **Tier 1** (highest CPC/ad value)       | United States, United Kingdom, Canada          |
| **Tier 2** (strong traffic, decent CPC) | Australia, Ireland, New Zealand                |
| **Tier 3** (volume boosters)            | South Africa, India (English-speaking segment) |

---

## 5. Content Optimization Rules

**Service:** `SEOOptimizer.ts`

### Meta Tags

- **Title Tag:** 50-60 characters, keyword-first, power words, brand suffix
- **Meta Description:** 150-160 characters, includes keyword, CTA, unique value proposition, emotional trigger
- **Canonical URL:** Self-referencing, absolute URL
- **Open Graph:** Title, description, image, type=article, site_name, locale
- **Twitter Card:** summary_large_image
- **Robots:** index, follow (default), noindex for thin content or duplicates

### Heading Structure

- **H1:** One per page, contains primary keyword, natural language, engaging
- **H2:** Major sections, includes secondary keywords, descriptive
- **H3:** Subsections under H2, long-tail variations
- **No skipping levels:** H2 to H4 is forbidden
- **Keyword in first H2:** Within first 20% of content

### Content Metrics

| Metric            | Target                     | Measurement           |
| ----------------- | -------------------------- | --------------------- |
| Keyword density   | 1-2%                       | Automated calculation |
| First 100 words   | Keyword in first paragraph | Content scan          |
| Image alt text    | <125 chars, descriptive    | Automated audit       |
| Internal links    | 2-5 per article            | Link graph analysis   |
| External links    | 1-3 per article            | Content scan          |
| URL slug          | <60 chars, no stop words   | Automated validation  |
| Table of Contents | For articles >1000 words   | Word count check      |

### Breadcrumb Schema

Every article includes BreadcrumbList schema:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yoursite.com/" },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Sports",
      "item": "https://yoursite.com/category/sports/"
    },
    { "@type": "ListItem", "position": 3, "name": "Article Title" }
  ]
}
```

---

## 6. Monetization Strategy

### 6.1 Revenue Streams

| Stream              | Timeline  | Setup Required                                            | Estimated Revenue (Month 6+)     |
| ------------------- | --------- | --------------------------------------------------------- | -------------------------------- |
| Google AdSense      | Month 2-3 | 20-30 quality posts, privacy/terms pages, custom domain   | $200-500/month (at 10K sessions) |
| Affiliate Marketing | Month 3+  | Amazon Associates, sports merchandise, streaming services | $100-300/month                   |
| Sponsored Content   | Month 6+  | Media kit, pitch deck, rate card                          | $200-500/post                    |
| Mediavine/AdThrive  | Month 9+  | Requires 50K+ sessions/month                              | $1,000-3,000/month               |

### 6.2 Cost Breakdown (Monthly)

| Service       | Purpose                                        | Estimated Cost     |
| ------------- | ---------------------------------------------- | ------------------ |
| VPS / Hosting | Node.js server hosting                         | $5-20              |
| Domain        | Custom domain for AdSense                      | $10-15/year        |
| SerpAPI       | All search data (trends, SERP, news, keywords) | $50-150            |
| Groq API      | AI content generation                          | $5-10              |
| Cloudflare    | CDN, SSL, caching, security                    | Free tier          |
| **Total**     |                                                | **~$60-180/month** |

### 6.3 Monetization Flow

1. **Traffic Acquisition:** SEO-optimized articles drive organic traffic from Google
2. **Ad Revenue:** AdSense display ads on article pages, optimized for viewability
3. **Affiliate Links:** Contextual product/service recommendations in relevant articles (Amazon, sports betting where legal, streaming services, merchandise)
4. **Sponsored Content:** Brand partnerships for topical articles (clearly marked, nofollow links, editorial independence maintained)
5. **Premium Content (Future):** Exclusive analysis, early access, ad-free experience

### 6.4 Ad Placement Rules

- Maximum 1 auto-ad per visible viewport
- No ads above the fold that push content below 50% of viewport
- In-content ads only after 3rd paragraph
- Video ads require user interaction to play
- No pop-ups, interstitials, or auto-redirects (AdSense policy compliance)
