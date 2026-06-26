# Content Quality Safeguards — GameDayWire

Seven hard-coded anti-slop rules, banned phrase detection, readability gate, duplicate detection, and human override triggers that ensure every published article meets strict quality standards.

---

## 1. The 7 Anti-Slop Rules (Hard-Coded)

These rules are enforced programmatically before any article is published. If any rule fails, the article is rejected and regenerated with stricter constraints.

### Rule 1: Minimum Data Points

Every article must include at least **3 specific statistics, dates, or quotes** from verifiable sources identified via SerpAPI `news_results`. Articles without sufficient data are rejected and regenerated with expanded SerpAPI queries.

**Implementation:**

- SerpAPI `search.json?tbm=nws&tbs=qdr:h` fetches recent news
- `ContentGuide.ts` extracts data points: statistics, numbers, quotes, dates
- `QualityGate` validates count >= 3 before passing to GroqWriter
- If insufficient data: expand search query, increase geo scope, retry

### Rule 2: Narrative Angle Enforcement

The Content Guide's narrative angle is **mandatory**. The AI cannot deviate into generic summaries.

**Implementation:**

- The `narrative_angle` field in the Content Guide is marked as `=== MANDATORY ===`
- Groq is instructed: "You MUST follow the narrative angle below. If you write a generic summary, you will be regenerated."
- After generation, `TextAnalyzer.ts` checks the first 200 words for alignment with the specified angle
- If deviation detected: regenerate with stronger angle reinforcement

### Rule 3: Freshness Requirement

All data points must be from the **last 48 hours**. Historical context is allowed but must be clearly marked as "Background" or "Context" and cannot exceed 20% of the article.

**Implementation:**

- Data points from SerpAPI `news_results` are timestamped
- Articles can reference historical context but only in designated "Background" sections
- The Content Guide's Section Blueprint includes a "Context" section for historical framing
- The "Deep Dive" section must center on recent developments

### Rule 4: Originality Check

Before publishing, the system sends the article to Groq with a verification prompt: _"Does this article appear to be a summary of existing news, or does it offer original analysis and prediction?"_

**Implementation:**

- After generation, the article body is sent to Groq with the originality check prompt
- Groq responds with a judgment: `original` or `summary`
- If flagged as `summary`, regenerate with a stricter guide that demands more analysis
- Maximum 3 regeneration attempts before human override

### Rule 5: Readability Gate

Flesch-Kincaid score must be between **60-70** (8th-9th grade reading level).

**Implementation:**

- `TextAnalyzer.ts` calculates Flesch-Kincaid Grade Level and Reading Ease
- Target: Reading Ease 60-70
- Too complex (< 60): rewrite with simpler vocabulary and shorter sentences
- Too simple (> 70): add analytical depth and domain-specific terminology

**Flesch-Kincaid Formula:**

```
Reading Ease = 206.835 - 1.015 x (total words / total sentences) - 84.6 x (total syllables / total words)

Grade Level = 0.39 x (total words / total sentences) + 11.8 x (total syllables / total words) - 15.59
```

### Rule 6: Duplicate Detection

Compare new article's semantic fingerprint against all existing articles. Threshold: **85% similarity** = reject and rewrite with different angle.

**Implementation:**

- Each article is stored with a content fingerprint
- Before publishing, the new article's content is compared against all existing articles
- Similarity scoring uses TF-IDF vector comparison
- Thresholds:
  - **>85% similarity:** Hard reject — regenerate with completely different angle
  - **75-85% similarity:** Warning — continue but flag for review
  - **<75% similarity:** Pass — proceed with publishing

### Rule 7: AI Phrase Ban List

Articles containing any banned phrases are **auto-rejected**.

**Implementation:**

- A curated list of AI slop phrases is checked against every article
- Check is case-insensitive and covers all content blocks, headings, and meta descriptions
- If any banned phrase is found: regenerate with stricter guide that explicitly forbids the matched phrase

---

## 2. Banned Phrase List

These phrases are automatically detected and cause instant rejection of the generated article:

### Generic Openers

- "In today's digital age..."
- "In today's world..."
- "In the world of sports..."
- "In today's entertainment news..."
- "In this article, we will..."
- "Welcome to our guide on..."

### Filler Phrases

- "It is important to note that..."
- "It is worth mentioning that..."
- "It goes without saying that..."
- "As we have seen..."
- "As mentioned earlier..."
- "Needless to say..."
- "It should be noted that..."

### Conclusion Clichés

- "In conclusion..."
- "To sum up..."
- "In summary..."
- "In closing..."
- "To wrap things up..."

### AI Hallucination Markers

- "The landscape of..."
- "A tapestry of..."
- "Delve into..."
- "Multifaceted..."
- "Leverage..."
- "Robust..."
- "Game-changer..."
- "Revolutionary..."
- "In the ever-evolving world of..."
- "In the rapidly changing landscape of..."
- "It's a complex and nuanced topic..."

### Overused AI Modifiers

- "Truly"
- "Essentially"
- "Basically"
- "Importantly"
- "Interestingly"
- "Notably"
- "Significantly"
- "Crucially"
- "Undoubtedly"

### Other Forbidden Patterns

- Summarizing Wikipedia or existing articles
- Listing basic facts without analysis or context
- More than 20% passive voice
- Starting with a question ("Have you ever wondered...")
- Generic praise ("This amazing player...")

---

## 3. Text Quality Analysis

**Service:** `TextAnalyzer.ts`

### Readability Scoring

| Score Range | Grade Level       | Interpretation                   |
| ----------- | ----------------- | -------------------------------- |
| 90-100      | 5th grade         | Very easy to read                |
| 80-90       | 6th grade         | Easy                             |
| **70-80**   | **7th grade**     | **Fairly easy (target range)**   |
| **60-70**   | **8th-9th grade** | **Plain English (target range)** |
| 50-60       | 10th-12th grade   | Fairly difficult                 |
| 30-50       | College           | Difficult                        |
| 0-30        | College graduate  | Very difficult                   |

### Sentiment Analysis

| Dimension         | Purpose                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Polarity          | Positive/negative/neutral — ensures appropriate tone for topic (e.g., serious tone for injury news, celebratory for wins) |
| Subjectivity      | Objective vs. opinionated — news articles should be objective, profiles can be more subjective                            |
| Emotional valence | Anger, sadness, joy, surprise — used to match article type expectations                                                   |

### Keyword Density Validation

| Metric                      | Target              |
| --------------------------- | ------------------- |
| Primary keyword density     | 1-2% of total words |
| Secondary keyword density   | 0.5-1% each         |
| Keyword in first 100 words  | Required            |
| Keyword in H1               | Required            |
| Keyword in first H2         | Required            |
| Keyword in meta description | Required            |
| Keyword in URL slug         | Required            |

---

## 4. Human Override Points

While the system is fully automated, these triggers **pause for manual review** (notification sent via email/webhook):

| Trigger                   | Condition                                                                         | Action                 |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------- |
| Sensitive topic           | Trending topic involves death, scandal, legal issues, political controversy       | Manual review required |
| Difficulty spike          | Keyword difficulty >50 at time of writing (was <40 at selection)                  | Pause generation       |
| Repeated quality failure  | AI output fails quality gates 3 times in a row                                    | Stop generation chain  |
| Algorithm update detected | SerpAPI detects major Google algorithm update in progress                         | Pause all generation   |
| Insufficient content      | Article word count <600 after generation                                          | Manual review          |
| Low data points           | Content guide contains fewer than 2 data points                                   | Manual review          |
| Near-duplicate warning    | Duplicate detection at >75% similarity (warning threshold before 85% hard reject) | Flag for review        |

**Notification Channels:**

| Severity | Channel                         | Response Time          |
| -------- | ------------------------------- | ---------------------- |
| Critical | Email + Webhook (Slack/Discord) | Immediate              |
| Error    | Email                           | Within 1 hour          |
| Warning  | Log only                        | Review in daily digest |
| Info     | Log only                        | Weekly review          |

---

## 5. Content Refresh Quality

**Service:** `ContentRefresher.ts`

### Refresh Triggers

- **Time-based:** 30 days since last update
- **Position drop:** >5 spots in SERP position
- **Trend resurgence:** SerpAPI volume increase >20%
- **Competitor update:** Detected via SerpAPI position monitoring
- **Seasonal relevance:** Pre-draft, pre-awards season, playoffs, etc.

### Refresh Quality Rules

1. **Preserve URL and backlinks** — The article slug and all inbound links remain unchanged
2. **Update `dateModified` schema** — Structured data reflects the update date
3. **"Updated [Date]" badge** — Visible to readers, shows editorial freshness
4. **Section-level updates only** — Rewrite affected sections while preserving structure
5. **No URL changes** — Never change the slug of a published article
6. **Re-validate quality gates** — Refreshed content must pass all 7 anti-slop rules

### Refresh Process Flow

```
Identify Stale Articles -> SerpAPI Fresh Data Fetch -> Content Refresh Guide -> GroqWriter Rewrite Sections
Preserve URL & Backlinks <- Update PostgreSQL dateModified <- SEO Re-optimize <- Link Re-inject
Cache Invalidate
```

---

## 6. Quality Metrics Dashboard

| Metric                  | Target     | Measured By       | Action If Failing                      |
| ----------------------- | ---------- | ----------------- | -------------------------------------- |
| Data points per article | >= 3       | ContentGuide.ts   | Expand SerpAPI query, retry            |
| Flesch-Kincaid score    | 60-70      | TextAnalyzer.ts   | Regenerate with readability adjustment |
| Duplicate similarity    | < 75%      | TextAnalyzer.ts   | Change angle, regenerate               |
| Banned phrase count     | 0          | TextAnalyzer.ts   | Regenerate with explicit ban           |
| Word count              | 800-1500   | ArticleBuilder.ts | Regenerate with length adjustment      |
| Keyword density         | 1-2%       | TextAnalyzer.ts   | Manual review                          |
| Schema validation       | 100% valid | SchemaBuilder.ts  | Fix schema, regenerate                 |
| Internal links          | 2-5        | LinkManager.ts    | Insert links post-generation           |
| External links          | 1-3        | LinkManager.ts    | Insert citations post-generation       |
