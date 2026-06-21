# Content Pipeline — The 7-Stage Engine

The heart of GameDayWire. Every article passes through 7 stages, each handled by a dedicated TypeScript service. The pipeline is fully automated — from raw SerpAPI trend data to a fully published, SEO-optimized article — without human intervention.

---

## Publishing Schedule

| Article             | Time (UTC) | Local Equivalents                         |
| ------------------- | ---------- | ----------------------------------------- |
| **Morning Article** | 08:00 UTC  | 3 AM ET / 8 AM GMT / 4 PM AEST            |
| **Evening Article** | 19:00 UTC  | 2 PM ET / 7 PM GMT / 5 AM AEST (next day) |

**Rationale:** 8 AM UTC captures European morning traffic. 7 PM UTC captures US afternoon/evening and Australian next-morning traffic. This staggered approach maximizes global reach without geo-specific duplication.

---

## Stage 1: Trend Discovery

**Service:** `TrendFinder.ts`

**SerpAPI Trend Mining:**

Endpoint: `trending_searches`

- Query parameters: `geo=US,GB,CA,AU,IE,NZ,ZA` (rotated per run)
- Timeframe: Real-time (SerpAPI provides current trending data)
- Categories: Filtered client-side for sports and entertainment topics
- Filter: Rising queries with breakout or >200% growth
- Output: Raw trending queries with estimated volume

Supplemental Endpoint: `search.json` with `tbm=nws`

- Purpose: Validate trending topics with news volume
- Filter: Articles published within last 4 hours
- Output: News headline density as proxy for trend strength

**Trend Scoring Algorithm:**

Each candidate topic receives a composite score:

```
Trend Score = (Search Volume x 0.4) + (Growth Rate x 0.3) + (Recency x 0.2) + (Geo-Relevance x 0.1)

Where:
- Search Volume: Minimum 500 (filtered out if below)
- Growth Rate: Percentage increase in last 4 hours (from SerpAPI trend data)
- Recency: Hours since first detection (lower = higher score)
- Geo-Relevance: Number of target countries showing the trend
```

**Top 2 topics per day are selected automatically** — one for Sports, one for Entertainment. No human approval. The system is fully autonomous at this stage. Unselected trends are stored for future keyword matrix expansion.

---

## Stage 2: Keyword Selection

**Service:** `KeywordMatrix.ts`

**From Trend to Keyword:**

1. Extract the **head term** from the trending query (e.g., "LeBron James" from "LeBron James retirement news")
2. Generate **keyword matrix** using predefined modifiers:
   - **Sports:** `stats`, `contract`, `injury update`, `vs [rival]`, `net worth 2026`, `draft`, `trade rumors`, `playoff chances`, `fantasy value`, `betting odds`, `career milestones`, `team news`, `highlights`, `predictions`
   - **Entertainment:** `net worth`, `dating`, `movies 2026`, `red carpet`, `controversy`, `interview`, `fashion`, `tour dates`, `streaming`, `box office`, `awards predictions`, `behind the scenes`, `feud`, `collaboration`

3. Validate each combination via **SerpAPI `search.json`** with volume/difficulty parameters:
   - Minimum search volume: 500
   - Keyword difficulty: < 40 (low competition)
   - CPC: > $0.50 (indicates commercial intent)
   - SERP features available: Featured Snippet, People Also Ask, Top Stories

4. **Select the winning keyword** — highest priority score:

```
Priority = (Search Volume / Keyword Difficulty) x CPC x Intent Multiplier

Intent Multipliers:
- Informational: 1.0
- Commercial: 1.5
- Transactional: 2.0
- News: 1.3
- Navigational: 0.5
```

**Living Keyword Matrix:** The system maintains a continuously auto-updating keyword database. Head terms are refreshed from SerpAPI trending searches. Modifier pools are expanded via SerpAPI `related_searches` discovery. Combinations are auto-generated and scored daily. The matrix prevents duplicate keyword targeting and prunes stale entries.

---

## Stage 3: Content Guide Creation

**Service:** `ContentGuide.ts`

**The Problem:** Most AI blogs fail because they prompt the AI with "Write an article about X" and get generic summaries of existing content.

**The Solution:** A **Content Guide** is a structured document that tells the AI exactly what to write, what data to include, what angle to take, and what sources to reference. It is generated programmatically before the article is written.

**Content Guide Structure:**

```
GUIDE ID: [UUID]
TARGET KEYWORD: [Primary Keyword]
SECONDARY KEYWORDS: [3-5 related terms from SerpAPI related_searches]
SEARCH INTENT: [Informational/Commercial/News/Comparison]
ARTICLE TYPE: [News/How-To/Comparison/Listicle/Profile/Review]
TARGET WORD COUNT: [800-1500 based on SERP analysis of top 10]
READING LEVEL: [Flesch-Kincaid 60-70]

=== SERP ANALYSIS (from SerpAPI search.json) ===
Top 10 Average Word Count: [X]
Common Subheadings: [H2/H3 patterns from competitors]
Content Gaps: [What top 10 DON'T cover]
Featured Snippet Format: [Paragraph/List/Table -- target this format]
People Also Ask Questions: [5-7 questions from SerpAPI related_questions]

=== DATA POINTS TO INCLUDE ===
[Extracted from SerpAPI news_results + related data]
- Statistic 1: [Specific number + source from news]
- Statistic 2: [Specific number + source from news]
- Quote: [From recent interview or press conference via news]
- Timeline: [Key dates related to the topic]
- Comparison: [If applicable, specific metrics to compare]
- Recent Development: [News from last 48 hours]

=== NARRATIVE ANGLE ===
[Determined by trend analysis + SerpAPI news sentiment]
What is the STORY? Not just facts -- the narrative thread.
Example: How LeBron James at 41 is rewriting the aging-athlete narrative

=== SECTION BLUEPRINT ===
1. Hook (1 paragraph): [Specific angle -- no generic intro]
2. Context (2-3 paragraphs): [Why this matters NOW, not historically]
3. Deep Dive (4-6 paragraphs): [Data-driven analysis with sources]
4. Implications (2 paragraphs): [What happens next -- predictive]
5. Expert Take (1 paragraph): [Synthesized perspective, not generic]
6. FAQ (3-5 questions): [Based on SerpAPI People Also Ask data]

=== FORBIDDEN PATTERNS ===
- Do not start with "In the world of sports..." or "In today's entertainment news..."
- Do not use "It is important to note that..."
- Do not summarize Wikipedia or existing articles
- Do not list basic facts without analysis or context
- Do not use passive voice more than 20% of sentences
- Do not use AI filler phrases ("delve into", "landscape", "tapestry", "multifaceted")

=== INTERNAL LINK OPPORTUNITIES ===
[Auto-detected from existing articles database]
- Maximum 5 internal links per article

=== EXTERNAL LINK OPPORTUNITIES ===
[Authoritative sources identified via SerpAPI news_results]
- ESPN: [specific article URL from news]
- BBC Sport: [specific article URL from news]
- Sky Sports: [specific article URL from news]
- The Hollywood Reporter: [specific article URL from news]
- Official sources: [team website, league site, artist official page]
```

**How the Guide is Built:**

1. **SERP Data Aggregation:** SerpAPI `search.json` fetches the top 10 ranking pages. The system extracts:
   - Common subheadings (what Google thinks users want)
   - Missing content gaps (what top 10 DON'T cover)
   - People Also Ask questions (from `related_questions` parameter)
   - Related searches (from `related_searches` parameter)
   - Average content length and format

2. **News Data Injection:** SerpAPI `search.json` with `tbm=nws` fetches recent news articles. The system extracts:
   - Key statistics and numbers
   - Direct quotes from interviews
   - Timeline of recent events
   - Sentiment direction (positive/negative/controversial)

3. **Angle Generation:** Groq analyzes the trend data + news headlines + SerpAPI sentiment to determine the dominant narrative angle (e.g., "underdog story," "controversy," "record-breaking," "comeback," "industry shift")

4. **Guide Assembly:** TypeScript compiles all SerpAPI data into the structured guide above.

5. **AI Writing:** Groq receives the **Guide**, not a generic prompt. It writes within the constraints.

**Template-Driven Content:**

10 master templates cover 90% of sports/entertainment content. Each template has a predefined structure, data requirements, narrative rules, SEO parameters, and schema type. Template selection is automatic based on keyword intent and SERP analysis:

| Template Type | Best For                    | Schema Type          | Key Sections                                            |
| ------------- | --------------------------- | -------------------- | ------------------------------------------------------- |
| News/Breaking | Timely events, game results | NewsArticle          | Hook, Context, Updates, Analysis, What's Next           |
| How-To Guide  | Instructional content       | HowTo                | Requirements, Steps (numbered), Tips, Troubleshooting   |
| Comparison    | Head-to-head, vs articles   | Article + Table      | Overview, Side-by-side, Winner by category, Verdict     |
| Listicle      | Rankings, best-of           | Article + ItemList   | Numbered items with original commentary between entries |
| Profile       | Athletes, celebrities       | ProfilePage + Person | Background, Career highlights, Current status, Legacy   |
| Review        | Movies, shows, products     | Review + Movie       | Verdict, Pros/Cons, Deep dive, Rating, Alternatives     |
| Prediction    | Forecast, speculation       | Article              | Current state, Factors, Predictions, Timeline           |
| Analysis      | Deep data-driven            | Article              | Data points, Trends, Implications, Expert takes         |
| FAQ           | Question-based content      | FAQPage              | Questions ordered by search frequency                   |
| Roundup       | Multi-source summary        | Article + ItemList   | Category overviews, Key takeaways, Rankings             |

---

## Stage 4: AI Content Generation

**Service:** `GroqWriter.ts`

The system sends a structured prompt containing the full Content Guide to Groq, not a generic request. The prompt architecture enforces strict adherence to data points, narrative angle, and output format.

**Groq Parameters:**

- Model: `llama-4-70b` (primary), `mixtral-8x7b` (fallback)
- Temperature: 0.3 (factual consistency)
- Max tokens: 4096
- Top-p: 0.9
- JSON mode: enabled

**Output Format (validated JSON):**

```json
{
  "title": "[SEO-optimized title, 50-60 chars]",
  "meta_description": "[155 chars max, include keyword, compelling CTA]",
  "h1": "[Primary keyword in natural, engaging form]",
  "content_blocks": [
    { "type": "h2", "text": "..." },
    { "type": "p", "text": "..." },
    { "type": "ul", "items": ["...", "..."] },
    { "type": "blockquote", "text": "...", "source": "..." },
    { "type": "table", "headers": ["..."], "rows": [["..."]] }
  ],
  "faq": [{ "question": "...", "answer": "..." }],
  "schema_markup": {
    "@context": "https://schema.org",
    "@type": "Article",
    "...": "..."
  },
  "suggested_images": [{ "description": "...", "alt_text": "..." }]
}
```

**Why JSON Output:**

- Guarantees structured content
- Enables automated internal link insertion
- Ensures schema markup is valid
- Prevents formatting drift
- Allows programmatic SEO element injection

**Retry Logic:** If validation fails, retry up to 3 times with 5-second delay. If all attempts fail, flag for manual review.

---

## Stage 5: SEO Optimization

**Service:** `SEOOptimizer.ts`

Every article is optimized according to Rank Math's core SEO framework:

**Meta Tags:**

- **Title Tag:** 50-60 characters, keyword-first, power words, brand suffix
- **Meta Description:** 150-160 characters, includes keyword, CTA, unique value proposition, emotional trigger
- **Canonical URL:** Self-referencing, absolute URL
- **Open Graph:** Title, description, image, type=article, site_name, locale
- **Twitter Card:** summary_large_image
- **Robots:** index, follow (default), noindex for thin content or duplicates

**Heading Structure (Strict Hierarchy):**

- **H1:** One per page, contains primary keyword, natural language, engaging
- **H2:** Major sections, includes secondary keywords, descriptive
- **H3:** Subsections under H2, long-tail variations
- **No skipping levels:** H2 to H4 is forbidden
- **Keyword in first H2:** Within first 20% of content

**Schema Auto-Selection (based on content type analysis):**

| Content Type                | Schema Types                        |
| --------------------------- | ----------------------------------- |
| Breaking news               | `NewsArticle` + `BreadcrumbList`    |
| Player/celebrity profile    | `ProfilePage` + `Person`            |
| Game/event preview or recap | `SportsEvent` + `FAQPage`           |
| Movie review                | `Movie` + `Review`                  |
| Comparison article          | `Article` + `Table` structured data |
| Listicle                    | `Article` + `ItemList`              |
| How-to guide                | `HowTo` + `Article`                 |

**Content Optimization:**

- **Keyword density:** 1-2% (natural placement, no stuffing)
- **First 100 words:** Keyword appears in first paragraph, ideally first sentence
- **Image alt text:** Descriptive, keyword where natural, under 125 characters
- **Internal links:** 2-5 per article, contextual anchor text, dofollow
- **External links:** 1-3 per article, to authoritative sources, `rel="nofollow noopener"`, `target="_blank"`
- **URL slug:** Short, keyword-focused, hyphen-separated, no stop words, under 60 characters
- **Table of Contents:** For articles >1000 words, with jump links

---

## Stage 5.5: Per-Article SEO Optimization Checklist

**Service:** `SEOOptimizer.ts`

After the article is generated and SEO metadata is applied, a per-article optimization checklist is validated against the content. Each article must achieve 100% pass rate across all four categories before it proceeds to intelligent linking.

Each item is scored Pass/Fail. The system attempts automated fixes for failed items (up to 3 regeneration attempts) before flagging for manual review.

### Basic SEO (6 checks)

These are the foundational SEO requirements for every article:

| #   | Check                       | Requirement                                                      | Auto-Fix                             |
| --- | --------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| 1   | Keyword in SEO title        | Focus keyword must appear in the `<title>` tag                   | Regenerate title with keyword        |
| 2   | Keyword in meta description | Focus keyword must appear in the meta description                | Regenerate meta description          |
| 3   | Keyword in URL              | Focus keyword must be present in the URL slug                    | Rewrite slug                         |
| 4   | Keyword in opening          | Focus keyword must be used within the first 100 words of content | Rewrite opening paragraph            |
| 5   | Keyword in content          | Focus keyword must appear at least once in the body              | Inject natural mention or regenerate |
| 6   | Content length              | Article must be 600-2500 words                                   | Regenerate with target word count    |

**Progress Bar:**

```
Basic SEO     [■■■■■■■■□□] 6 / 6
```

### Additional SEO (9 checks)

Advanced optimization checks that strengthen topical authority:

| #   | Check                   | Requirement                                                          | Auto-Fix                                      |
| --- | ----------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Keyword in subheadings  | Focus keyword must appear in at least one H2 or H3                   | Rewrite closest subheading to include keyword |
| 2   | Image alt text          | At least one image with keyword-rich alt text                        | Generate image suggestion with alt text       |
| 3   | Keyword density         | ~1% keyword density (natural, no stuffing)                           | Adjust content or regenerate                  |
| 4   | Short URL               | URL must be concise, under 60 chars, no stop words                   | Regenerate slug                               |
| 5   | External links          | 1-3 dofollow links to authoritative external sources                 | Inject citations                              |
| 6   | External resources      | DoFollow external links to trusted sources                           | Pre-approved tier list injection              |
| 7   | Internal links          | 2-5 internal links to existing GameDayWire articles                  | Smart link insertion                          |
| 8   | Focus keyword set       | Primary focus keyword must be configured in metadata                 | Default from Content Guide                    |
| 9   | Content AI optimization | Content must use structured data, tables, or lists where appropriate | Inject schema or reformat dense paragraphs    |

**Progress Bar:**

```
Additional    [■■■■■■■■□□] 9 / 9
```

### Title Readability (4 checks)

Optimization checks for the article's SEO title:

| #   | Check            | Requirement                                                                                           | Auto-Fix                                      |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Keyword position | Focus keyword should appear near the beginning of the SEO title                                       | Regenerate title with keyword-first structure |
| 2   | Sentiment word   | Title must contain a positive or negative sentiment word                                              | Rewrite title with emotional trigger          |
| 3   | Power word       | Title must contain at least one power word (e.g., Ultimate, Essential, Proven, Exclusive, Unmissable) | Rewrite title with power word                 |
| 4   | Number in title  | SEO title should include a number (e.g., "5 Ways...", "Top 10...", "3 Reasons...")                    | Rewrite title with number                     |

**Progress Bar:**

```
Title Read.   [■■■■■■■■□□] 4 / 4
```

### Content Readability (3 checks)

Readability and UX optimization for the article body:

| #   | Check              | Requirement                                                           | Auto-Fix                                  |
| --- | ------------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| 1   | Table of Contents  | Articles >1000 words must include a table of contents with jump links | Generate ToC from section headings        |
| 2   | Concise paragraphs | Paragraphs should be 2-4 sentences max for readability                | Split long paragraphs                     |
| 3   | Visual content     | Article must include at least one image or video                      | Auto-suggest or generate a relevant image |

**Progress Bar:**

```
Readability   [■■■■■■■■□□] 3 / 3
```

### Checklist Scoring

The system aggregates all 22 checks into a score out of 100:

| Score            | Verdict   | Action                                 |
| ---------------- | --------- | -------------------------------------- |
| 100/100 (22/22)  | Pass      | Proceed to Intelligent Linking         |
| 80-99 (18-21/22) | Warning   | Auto-fix failed items, then proceed    |
| 60-79 (13-17/22) | Fail      | Auto-fix, regenerate once, re-check    |
| 0-59 (<13/22)    | Hard Fail | Flag for manual review, do not publish |

If automated fix attempts exhaust (3 attempts), the article is escalated to manual review regardless of score.

---

## Stage 6: Intelligent Linking

**Service:** `LinkManager.ts`

**Internal Linking (Inbound):**

The system maintains an Article Graph in the database. Before publishing:

1. Parse the new article's content for known keywords from existing articles
2. Identify the first natural occurrence of each matching keyword
3. Replace with `<a href="https://yoursite.com/[slug]">[anchor text]</a>`
4. Limit: Maximum 5 internal links per article to avoid dilution
5. Priority: Links to articles with low traffic get priority (to distribute link equity)
6. Anchor text rules: Natural phrasing, no exact-match stuffing, contextual relevance

**External Linking (Outbound):**

The system does NOT link to competitors. Instead:

1. Cite authoritative sources for facts, statistics, and quotes
2. Use `rel="nofollow noopener noreferrer"` for all external links
3. Open in new tab (`target="_blank"`)
4. Sources are pre-approved tier list:
   - **Tier 1 (Sports):** ESPN, BBC Sport, Sky Sports, The Athletic, Sports Illustrated, official league sites (NBA.com, NFL.com, PremierLeague.com)
   - **Tier 1 (Entertainment):** Variety, The Hollywood Reporter, Deadline, Entertainment Weekly, Rolling Stone, official studio/artist pages
   - **Tier 2:** Reuters, AP News, CNN, Fox Sports, TMZ (for breaking news only)
   - **Forbidden:** Competitor blogs, content farms, unverified social media posts

**Smart Link Insertion Rules:**

- Never link to a page ranking for the same primary keyword (competitor avoidance)
- Always link to the most recent article on a related subtopic
- Anchor text must be natural — no exact-match keyword stuffing
- First internal link appears within the first 300 words
- External citations must support specific claims, not generic statements
- Every external link must have a corresponding data point or quote in the article

---

## Stage 7: Publishing

**Service:** `Publisher.ts`

Flow:

```
Finalized Article -> SQLite Save -> SitemapManager Update XML
GoogleIndexingAPI Ping -> RSSFeed Update -> Cache Invalidate
```

The Publisher:

- Generates HTML from content blocks with proper schema
- Saves article to SQLite via Prisma
- Updates XML sitemap via SitemapManager
- Pings Google Indexing API (new articles: `URL_NOTIFICATION`, updates: `URL_UPDATED`)
- Updates RSS feed via RSSFeed (full-text RSS 2.0 for Google Discover eligibility)
- Invalidates relevant caches (ISR, in-memory)
- Logs publication metrics
- Sends notification if quality gates fail

**Indexing API:** Retry up to 3 times on failure with exponential backoff. Log all indexing API responses.

**Sitemap Intelligence:**

- Priority values by article age: published within 24h (0.9), 7 days (0.8), 30 days (0.7), evergreen with traffic (0.6), older stable (0.5), underperforming (0.3)
- Change frequency: news articles (daily), evergreen guides (weekly), static pages (monthly)
- Image sitemap included for all articles with featured images
- Auto-submitted to Google Search Console on major updates

---

## Content Refresh Flow

**Service:** `ContentRefresher.ts`

**Triggers:**

- Time-based (30 days since last update)
- Position drop (>5 spots in SERP)
- Trend resurgence (SerpAPI volume increase >20%)
- Competitor update (detected via SerpAPI position monitoring)
- Seasonal relevance approaches (e.g., pre-draft, pre-awards season)

**Refresh Process:**

```
Identify Stale Articles -> SerpAPI Fresh Data Fetch -> Content Refresh Guide -> GroqWriter Rewrite Sections
Preserve URL & Backlinks <- Update SQLite dateModified <- SEO Re-optimize <- Link Re-inject
Re-ping Indexing API -> Cache Invalidate
```

1. Generate new Content Guide with updated SerpAPI data
2. Rewrite affected sections only (preserve URL and core structure)
3. Update `dateModified` schema
4. Add "Updated [Date]" badge visible to readers
5. Re-ping Indexing API
6. Log refresh in system_logs
