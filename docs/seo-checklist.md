# SEO Verification Checklist — GameDayWire

A comprehensive, itemized SEO checklist for verifying that every article and the entire site meets Google's quality standards. Each item includes verification instructions and, where applicable, commands to test the condition programmatically.

---

## Table of Contents

1. [Technical SEO (Site-Wide)](#1-technical-seo-site-wide)
2. [On-Page SEO (Per Article)](#2-on-page-seo-per-article)
3. [Content Quality Standards](#3-content-quality-standards)
4. [Performance and Core Web Vitals](#4-performance-and-core-web-vitals)
5. [Schema Markup Validation](#5-schema-markup-validation)
6. [Internal Linking Health](#6-internal-linking-health)
7. [Weekly SEO Audit (seoAudit)](#7-weekly-seo-audit-seoaudit)
8. [Programmatic Verification Scripts](#8-programmatic-verification-scripts)

---

## 1. Technical SEO (Site-Wide)

### 1.1 Robots.txt

- [ ] Robots.txt is accessible at `https://yourdomain.com/robots.txt`
- [ ] File returns HTTP 200 (not 404 or 500)
- [ ] User-agent directive is `User-agent: *` (allow all crawlers)
- [ ] Disallow directives only block non-public paths (config/, lib/, cron/, cache/, logs/)
- [ ] Sitemap reference is present and correct: `Sitemap: https://yourdomain.com/api/sitemap`
- [ ] RSS feed reference is present: `Sitemap: https://yourdomain.com/api/rss`
- [ ] No Disallow of /article/, /category/, or /tag/ paths

**Verification command:**

```bash
curl -sI https://yourdomain.com/robots.txt | head -5
curl -s https://yourdomain.com/robots.txt
```

### 1.2 XML Sitemap

- [ ] Sitemap index is accessible at `/api/sitemap`
- [ ] Returns HTTP 200 with Content-Type: application/xml
- [ ] Sitemap index references article sitemaps and pages sitemap
- [ ] Article sitemap pages return valid XML with `<url>` entries
- [ ] Each URL entry includes `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>`
- [ ] Priority values follow the age/performance logic (0.9 for new, descending)
- [ ] No duplicate URLs in the sitemap
- [ ] No non-canonical URLs (www vs non-www, http vs https) in the sitemap
- [ ] All referenced URLs return HTTP 200
- [ ] Sitemap is referenced in robots.txt
- [ ] Sitemap is submitted to Google Search Console

**Verification commands:**

```bash
# Validate sitemap index
curl -s https://yourdomain.com/api/sitemap | head -20

# Validate article sitemap
curl -s "https://yourdomain.com/api/sitemap?type=articles&page=1" | head -20
```

### 1.3 RSS Feed

- [ ] RSS feed is accessible at `/api/rss`
- [ ] Returns HTTP 200 with Content-Type: application/rss+xml
- [ ] Valid RSS 2.0 XML structure (channel, title, link, description, items)
- [ ] Each item has `<title>`, `<link>`, `<guid>`, `<pubDate>`, `<description>`
- [ ] Full article content present in `<content:encoded>` (not just excerpts)
- [ ] Featured images present in `<media:content>` tags
- [ ] Self-referencing `<atom:link>` present in channel
- [ ] No more than 20 items in the default feed
- [ ] Category filtering works (`?category=sports` and `?category=entertainment`)
- [ ] Feed validates against W3C RSS Feed Validator

### 1.4 Canonical URLs

- [ ] Every page has a self-referencing canonical link tag in the `<head>`
- [ ] Canonical URL uses the absolute URL (`https://yourdomain.com/article/slug/`)
- [ ] Canonical URL does not include query parameters (except pagination)
- [ ] No conflicting canonical tags
- [ ] Canonical tags present on all page types: articles, categories, static pages

**Verification command:**

```bash
curl -s https://yourdomain.com/article/sample-slug/ | grep -oP '<link rel="canonical" href="[^"]+"'
```

### 1.5 Meta Robots Tags

- [ ] Published articles have `<meta name="robots" content="index, follow">`
- [ ] Draft/unpublished articles have `<meta name="robots" content="noindex, nofollow">`
- [ ] Thin or duplicate content pages have `<meta name="robots" content="noindex">`
- [ ] No conflicting robots directives (meta tag vs X-Robots-Tag header vs robots.txt)

### 1.6 Hreflang Tags

- [ ] If implementing geo-specific versions, hreflang tags are present in the `<head>`
- [ ] x-default hreflang is specified for the primary version
- [ ] Self-referencing hreflang is present
- [ ] All hreflang return URLs are valid (no 404s)
- [ ] No contradicting hreflang annotations

### 1.7 Security Headers

- [ ] X-Frame-Options: DENY is present
- [ ] X-Content-Type-Options: nosniff is present
- [ ] Referrer-Policy: strict-origin-when-cross-origin is present
- [ ] Content-Security-Policy is present and restrictive
- [ ] Strict-Transport-Security is present (max-age=31536000; includeSubDomains)
- [ ] Permissions-Policy restricts geolocation, microphone, camera
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)

**Verification command:**

```bash
curl -sI https://yourdomain.com | grep -E "(X-Frame|X-Content|Referrer|Content-Security|Strict-Transport|Permissions-Policy)"
```

---

## 2. On-Page SEO (Per Article)

### 2.1 Title Tag

- [ ] Length is between 50 and 60 characters
- [ ] Primary keyword appears within the first 60 characters of the title
- [ ] Keyword appears within the first 3 words (ideally the first word)
- [ ] Contains at least one power word (Ultimate, Complete, Essential, Proven, Updated, Exclusive, Best, Top, Shocking, Revealed)
- [ ] Contains a year or recency indicator (2026, Latest, Today, This Week, Breaking)
- [ ] Contains a number if applicable (Top 5, 7 Best, 10 Reasons)
- [ ] Brand name appears at the end separated by pipe or dash
- [ ] No duplicate titles across the site
- [ ] No title tag truncation (visible in SERP preview)
- [ ] No all-caps words (except proper nouns like NBA, NFL, WWE)
- [ ] Emotional trigger words present where appropriate (Shocking, Surprising, Revealed)

**Verification via API:**

```bash
curl -s "https://yourdomain.com/api/articles?slug=lebron-james-stats-2025-2026-season" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
const title = j.data.articles[0].title;
console.log(title.length + ' chars:', title);
"
```

### 2.2 Meta Description

- [ ] Length is between 150 and 160 characters
- [ ] Contains the primary keyword (naturally, not stuffed)
- [ ] Includes a call to action (Learn, Discover, Read, Find out)
- [ ] Unique value proposition is clear (why read this article)
- [ ] No duplicate meta descriptions across the site
- [ ] Matches or complements the title (does not repeat it verbatim)
- [ ] No HTML tags, special characters, or unescaped quotes
- [ ] Ends with a compelling reason to click
- [ ] Includes secondary keywords where natural
- [ ] No fluff phrases ("Welcome to our article about...")

### 2.3 Heading Structure

- [ ] Exactly one H1 tag per page
- [ ] H1 contains the primary keyword in natural, engaging form
- [ ] H1 is not identical to the title tag (but closely related)
- [ ] Heading hierarchy follows H1 > H2 > H3 (no skipped levels)
- [ ] Primary keyword appears in the first H2
- [ ] First H2 appears within the first 20% of the content
- [ ] Secondary keywords appear in H2 and H3 tags naturally
- [ ] No empty headings
- [ ] No headings that are just keyword stuffing
- [ ] Question-based H2s for FAQ sections
- [ ] H3s are used for sub-sections under H2s, never as standalone section headers

### 2.4 Content Optimization

- [ ] Primary keyword appears in the first 100 words, ideally the first sentence
- [ ] Keyword density is between 1% and 2% (natural placement, no stuffing)
- [ ] Word count is between 800 and 1500 words
- [ ] Reading level (Flesch-Kincaid) is between 60 and 70 (8th-9th grade)
- [ ] Article contains original analysis, not just aggregation of facts
- [ ] At least 3 specific data points (statistics, dates, quotes) from verifiable sources
- [ ] No banned AI-slop phrases (see banned phrase list in [content-quality.md](guides/content-quality.md))
- [ ] Internal links are present (2-5 per article)
- [ ] External citations are present (1-3 per article)
- [ ] Active voice used in 80% or more of sentences
- [ ] Paragraphs are short (2-4 sentences max for readability)
- [ ] Transition sentences between sections for flow

### 2.5 URL Slug

- [ ] Slug is short (under 60 characters)
- [ ] Contains primary keyword
- [ ] Hyphen-separated words (never underscores or spaces)
- [ ] No stop words (and, or, but, the, a, an, of, in, to, for)
- [ ] All lowercase
- [ ] No special characters or non-ASCII characters
- [ ] No dates in slug (creates date-stamped URL issues for refreshes)
- [ ] Slug matches Google's preferred URL structure for the keyword

### 2.6 Image Optimization

- [ ] Featured image is present (1200x630px, WebP format)
- [ ] Featured image alt text is present and under 125 characters
- [ ] Alt text describes the image AND includes keyword where natural
- [ ] Images use `loading="lazy"` attribute
- [ ] Images served via CDN (or absolute URLs)
- [ ] File size under 100KB after WebP conversion
- [ ] No missing alt attributes on any images
- [ ] Image sitemap entries are present (if featured images exist)

### 2.7 Open Graph Tags

- [ ] og:title is present and matches title tag (within 60 chars for OG)
- [ ] og:description is present (2-4 sentences, compelling)
- [ ] og:image is present and 1200x630px
- [ ] og:type is set to "article"
- [ ] og:url is the canonical URL
- [ ] og:site_name matches SITE_NAME from .env
- [ ] og:locale is set (default: en_US)
- [ ] og:published_time and og:modified_time are present

**Verification command:**

```bash
curl -s https://yourdomain.com/article/sample-slug/ | grep -oP '<meta property="og:[^"]+" content="[^"]*"'
```

### 2.8 Twitter Card Tags

- [ ] twitter:card is set to "summary_large_image"
- [ ] twitter:title matches og:title
- [ ] twitter:description matches og:description
- [ ] twitter:image matches og:image
- [ ] twitter:site is set if a Twitter handle is configured

---

## 3. Content Quality Standards

### 3.1 Originality

- [ ] Article offers original analysis or insight (not just summarizing news)
- [ ] Article has a clear narrative angle (not a generic report)
- [ ] Data points are interpreted, not just listed
- [ ] Predictions or forward-looking statements are present
- [ ] Article takes a stance or perspective (not neutral to the point of blandness)
- [ ] No paragraphs that could apply to any topic (e.g., "In the world of sports...")

### 3.2 E-E-A-T Signals

- [ ] Author byline is present (real or brand name)
- [ ] Author bio or about page exists with expertise signals
- [ ] Sources are cited with links to authoritative, verifiable references
- [ ] Article covers a specific, well-defined topic (not broad and generic)
- [ ] Content demonstrates first-hand knowledge or analysis
- [ ] Site has a clear About page with contact information
- [ ] Privacy policy and terms of service are present (required for AdSense)
- [ ] Content is factually accurate (spot-check data points from cited sources)

### 3.3 Freshness Signals

- [ ] Article includes recent data (within 48 hours for news, 30 days for analysis)
- [ ] Dates are visible on articles (published_at and updated_at)
- [ ] Historical context is clearly labeled (e.g., "Background:" or "Context:" sections)
- [ ] Historical content does not exceed 20% of the article
- [ ] Updated articles show "Updated [date]" badge for readers
- [ ] dateModified in schema matches the actual content update date
- [ ] No stale content (articles older than 30 days without refresh)

### 3.4 Readability

- [ ] Flesch-Kincaid reading ease score between 60-70 (8th-9th grade level)
- [ ] Average sentence length under 20 words
- [ ] Short paragraphs (2-4 sentences)
- [ ] Subheadings break up long text sections
- [ ] Bullet points or numbered lists used where appropriate
- [ ] No walls of text (sections over 200 words without a heading or list break)
- [ ] Transitional phrases connect sections naturally

### 3.5 Banned Phrase Check

The system maintains a banned phrase list enforced by the TextAnalyzer service. Run this check manually:

- [ ] No "In today's digital age..."
- [ ] No "It is important to note that..."
- [ ] No "In conclusion..." or "To sum up..."
- [ ] No "As we have seen..."
- [ ] No "The landscape of..." or "A tapestry of..."
- [ ] No "Delve into..."
- [ ] No "Multifaceted..."
- [ ] No "Leverage..." (when used as business jargon)
- [ ] No "Robust..." (when used as filler)
- [ ] No "Navigating the complexities of..."
- [ ] No "In an ever-evolving world..."
- [ ] No "Let's dive into..."

---

## 4. Performance and Core Web Vitals

### 4.1 Page Load Performance

- [ ] Page load time is under 2 seconds (test with Chrome DevTools)
- [ ] Time to First Byte (TTFB) is under 500ms (static HTML cache should achieve this)
- [ ] Largest Contentful Paint (LCP) is under 2.5 seconds
- [ ] First Input Delay (FID) is under 100 milliseconds
- [ ] Cumulative Layout Shift (CLS) is under 0.1
- [ ] First Contentful Paint (FCP) is under 1.5 seconds
- [ ] Interaction to Next Paint (INP) is under 200 milliseconds

### 4.2 Image Optimization

- [ ] All images are in WebP format
- [ ] Featured images are 1200x630px at 72 DPI
- [ ] Inline images are no wider than 800px
- [ ] All images have `loading="lazy"` attribute (except the featured image)
- [ ] Image file sizes are under 100KB each
- [ ] Images are served from CDN
- [ ] No images larger than 2000px in any dimension

### 4.3 Asset Optimization

- [ ] CSS files are minified
- [ ] JavaScript files are minified and deferred (defer attribute)
- [ ] Render-blocking resources are minimized (inline critical CSS)
- [ ] Fonts are self-hosted in WOFF2 format
- [ ] No unused CSS or JavaScript
- [ ] Total page weight is under 500KB (including images)
- [ ] Number of HTTP requests is under 20

### 4.4 Caching Verification

- [ ] API cache exists for published articles
- [ ] Cache headers are set correctly (Cache-Control, Expires, ETag)
- [ ] Cloudflare edge caching is active (check CF-Cache-Status header)
- [ ] Browser caching is configured for static assets (1 year for CSS/JS/images)
- [ ] HTML pages have appropriate revalidation headers

**Verification command:**

```bash
# Check Cloudflare cache status
curl -sI https://yourdomain.com/article/sample-slug/ | grep -i "CF-Cache-Status"

# Check browser cache headers
curl -sI https://yourdomain.com/_next/static/css/main.css | grep -i "Cache-Control"
```

### 4.5 Compression

- [ ] Brotli or Gzip compression is active for all text content
- [ ] Content-Encoding header shows gzip or br
- [ ] Images are not double-compressed

---

## 5. Schema Markup Validation

### 5.1 Article Schema

- [ ] JSON-LD is present in the `<head>` section (not the body)
- [ ] @context is "https://schema.org"
- [ ] @type matches the article type (Article, NewsArticle, or auto-detected type)
- [ ] headline matches the article title
- [ ] description matches the meta description
- [ ] author is present (Person or Organization type)
- [ ] publisher is present (Organization type with name and logo)
- [ ] datePublished matches the article's published_at timestamp
- [ ] dateModified matches the article's updated_at timestamp
- [ ] image URL is the featured image URL (valid, not 404)
- [ ] mainEntityOfPage is the canonical URL
- [ ] Validation passes Google Rich Results Test

### 5.2 FAQ Schema (If FAQ Section Exists)

- [ ] FAQPage schema is present only if 3 or more FAQ items exist
- [ ] Each FAQ item has `mainEntity` with @type "Question"
- [ ] Each Question has a `name` and `acceptedAnswer` with @type "Answer"
- [ ] Each Answer has a `text` property with the answer content
- [ ] No FAQ items with empty answers
- [ ] FAQ schema passes Google's FAQ rich result validation
- [ ] FAQPage is nested within the main Article schema (not standalone)

### 5.3 BreadcrumbList Schema

- [ ] BreadcrumbList schema is present on all pages
- [ ] itemListElement is an array of ListItem objects
- [ ] Each ListItem has @type "ListItem", position (integer), name, and item
- [ ] Item URLs are canonical (absolute, HTTPS)
- [ ] Position starts at 1 (not 0)
- [ ] Homepage is always position 1
- [ ] Last position is the current page
- [ ] BreadcrumbList validates against Google's structured data guidelines

### 5.4 Additional Schema Types

- [ ] SportsEvent schema for game previews/recaps
- [ ] Movie schema for film reviews
- [ ] Person schema for athlete/celebrity profiles
- [ ] HowTo schema for how-to articles
- [ ] Organization schema for the site itself
- [ ] All schema validates with https://validator.schema.org/

**Verification command:**

```bash
# Extract JSON-LD from an article page
curl -s https://yourdomain.com/article/sample-slug/ | grep -oP '<script type="application/ld\+json">\K.*?(?=</script>)' | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
try { console.log(JSON.stringify(JSON.parse(d), null, 2)); }
catch(e) { console.error('Invalid JSON-LD:', e.message); }
"
```

---

## 6. Internal Linking Health

- [ ] Every article has at least 2 internal links (inbound or outbound)
- [ ] No article has more than 5 internal links (to avoid link dilution)
- [ ] No orphan pages (articles with zero internal links pointing to them)
- [ ] Anchor text is descriptive and natural (not "click here" or "read more")
- [ ] Internal links use dofollow (no `rel="nofollow"` on internal links)
- [ ] Broken internal links are reported and fixed within 48 hours
- [ ] Link graph is rebuilt weekly (confirmed by cron logs)
- [ ] High-value pages (cornerstone content) have more internal links pointing to them
- [ ] Newer articles link to older articles (distributing freshness signals)
- [ ] Homepage links to most recent articles (updated on publish)

### External Citations Verification

- [ ] External links use `rel="nofollow noopener noreferrer"`
- [ ] External links open in new tab (`target="_blank"`)
- [ ] Maximum 3 external links per article
- [ ] Links point to Tier 1 authoritative sources (ESPN, BBC Sport, Variety, Hollywood Reporter, official league/artist sites)
- [ ] No links to competitor blogs or content farms
- [ ] No links to pages ranking for the same primary keyword
- [ ] All external URLs are valid (not 404)
- [ ] External citations support specific data points (not general references)

---

## 7. Weekly SEO Audit (seoAudit)

### 7.1 What seoAudit Checks

The `seoAudit` cron job runs every Sunday at 05:00 UTC and performs automated checks.

**Link Health Check:**

- Iterates through every URL in the link_graph table and sends HTTP HEAD requests to verify they resolve.
- For internal links: verifies the target article still exists with published status.
- For external links: verifies the target domain is still reachable.
- Flags: broken_links (list of failed URLs removed from link_graph).

**Schema Markup Validation:**

- Extracts JSON-LD from every published article.
- Validates required fields (headline, description, author, publisher, datePublished).
- Validates @type is one of the supported schema types.
- Flags: missing_schema, invalid_schema.

**Meta Description Length Check:**

- Reads meta_description field for every published article.
- Flags: too_short (<140 characters), too_long (>165 characters), missing_meta.

**Duplicate Title Detection:**

- Compares title fields across all published articles.
- Flags: duplicate_titles (exact matches), near_duplicate_titles (fuzzy matches >90%).

**Sitemap Integrity:**

- Compares URL count in the sitemap against published article count.
- Flags: sitemap_mismatch (difference of more than 5).

**Banned Phrase Scan:**

- Scans content_html of recently published articles (last 7 days) for banned phrases.
- Flags: banned_phrase_detected.

**Keyword Cannibalization Check:**

- Checks for articles targeting the same primary keyword (headTerm match).
- Flags: keyword_cannibalization.

### 7.2 How to Interpret Audit Results

The audit writes results to `logs/audit/audit_YYYY-MM-DD.log`:

```json
{
  "timestamp": "2026-06-21T05:00:00Z",
  "check": "broken_links",
  "status": "issues_found",
  "issues": 3,
  "details": [
    {
      "slug": "old-article-2025",
      "broken_url": "https://example.com/dead-link",
      "type": "external"
    }
  ],
  "auto_fixes": [
    {
      "removed_from_link_graph": "https://example.com/dead-link",
      "target_slug": "old-article-2025"
    }
  ]
}
```

**Statuses:**

- `"passed"`: No issues found.
- `"issues_found"`: Issues found and auto-fixed. Review the auto_fixes section.
- `"manual_review"`: Issues requiring human attention (duplicate titles, keyword cannibalization).

**Priority actions after an audit:**

1. Fix all manual_review items first.
2. Review auto_fixes to ensure no incorrect removals.
3. Check banned_phrase_detected items and regenerate affected articles.
4. Verify sitemap count if sitemap_mismatch was flagged.
5. Review keyword cannibalization — consider merging or redirecting competing articles.

### 7.3 Automated Alerts

If the audit finds issues with severity "error" or "critical," it sends a notification based on the `ENABLE_NOTIFICATIONS` setting.

---

## 8. Programmatic Verification Scripts

```bash
# Run a full SEO audit manually (same as weekly cron)
node -e "
const { seoAudit } = require('./cron/seoAudit');
seoAudit({ dryRun: true }).then(console.log).catch(console.error);
"

# Check a specific article's SEO compliance
curl -s "https://yourdomain.com/api/articles?slug=article-slug" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const article = JSON.parse(d).data.articles[0];
console.log('Title:', article.title, '(' + article.title.length + ' chars)');
console.log('Meta:', article.metaDescription, '(' + (article.metaDescription?.length || 0) + ' chars)');
console.log('Word count:', article.wordCount);
console.log('Quality score:', article.qualityScore);
console.log('Reading level:', article.readingLevel);
console.log('Status:', article.status);
console.log('Published:', article.publishedAt);
"

# Validate all schema markup
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function validate() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { slug: true, schemaMarkup: true }
  });
  articles.forEach(a => {
    try {
      const schema = JSON.parse(a.schemaMarkup);
      const valid = schema['@context'] === 'https://schema.org';
      console.log(a.slug + ': ' + (valid ? 'VALID' : 'INVALID'));
    } catch (e) {
      console.log(a.slug + ': PARSE ERROR');
    }
  });
  await prisma.\$disconnect();
}
validate();
"
```
