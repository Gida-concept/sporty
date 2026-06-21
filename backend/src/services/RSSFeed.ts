import { config } from '@/config/index.js';
import { PrismaClient, Article } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedOptions {
  title?: string;
  description?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ITEMS = 50;
const GENERATOR = 'GameDayWire RSS Feed Generator';
const LANGUAGE = 'en-us';

const RSS_OPEN =
  '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// ---------------------------------------------------------------------------
// RSSFeed
// ---------------------------------------------------------------------------

class RSSFeed {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate an RSS 2.0 XML feed for published articles.
   * If articles are not provided, fetches the most recently published ones
   * from the database (up to options.limit or 50).
   */
  async generateFeed(articles?: Article[], options?: FeedOptions): Promise<string> {
    const items = articles ?? (await this.fetchArticles(options?.limit));

    const siteUrl = config.siteUrl.replace(/\/+$/, '');
    const feedUrl = `${siteUrl}/rss.xml`;

    const now = new Date();
    const title = options?.title ?? 'GameDayWire';
    const description =
      options?.description ?? 'Latest sports and entertainment articles from GameDayWire';

    const channel = [
      `<title>${this.escapeXml(title)}</title>`,
      `<link>${this.escapeXml(siteUrl)}</link>`,
      `<description>${this.escapeXml(description)}</description>`,
      `<language>${LANGUAGE}</language>`,
      `<lastBuildDate>${this.formatRFC2822(now)}</lastBuildDate>`,
      `<generator>${this.escapeXml(GENERATOR)}</generator>`,
      `<atom:link href="${this.escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
      ...items.map((article) => this.buildItem(article, siteUrl)),
    ].join('\n');

    return `${RSS_OPEN}\n<channel>\n${channel}\n</channel>\n</rss>`;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Fetch the most recently published articles from the database.
   */
  private async fetchArticles(limit?: number): Promise<Article[]> {
    return this.prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: Math.min(limit ?? MAX_ITEMS, MAX_ITEMS),
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  /**
   * Build a single RSS <item> element from an article.
   */
  private buildItem(
    article: Article & { categories?: Array<{ category: { name: string } }> },
    siteUrl: string,
  ): string {
    const articleUrl = `${siteUrl}/article/${article.slug}`;
    const pubDate = article.publishedAt
      ? this.formatRFC2822(article.publishedAt)
      : this.formatRFC2822(new Date());

    const description = this.buildDescription(article);

    const lines: string[] = [
      '<item>',
      `  <title>${this.escapeXml(article.title)}</title>`,
      `  <link>${this.escapeXml(articleUrl)}</link>`,
      `  <guid isPermaLink="true">${this.escapeXml(articleUrl)}</guid>`,
      `  <pubDate>${pubDate}</pubDate>`,
      `  <description>${description}</description>`,
    ];

    // Categories
    if (article.categories && article.categories.length > 0) {
      for (const ac of article.categories) {
        lines.push(`  <category>${this.escapeXml(ac.category.name)}</category>`);
      }
    }

    // Featured image via media:content — note that the Prisma Article model
    // does not include a featuredImage field by default; callers that include
    // an extended property at runtime will have it rendered here.
    const featuredImage = (article as Record<string, unknown>).featuredImage;
    if (typeof featuredImage === 'string' && featuredImage.length > 0) {
      lines.push(`  <media:content url="${this.escapeXml(featuredImage)}" medium="image"/>`);
    }

    lines.push('</item>');

    return lines.join('\n');
  }

  /**
   * Build the <description> element content. Uses CDATA when a
   * metaDescription is available; otherwise falls back to the first 500
   * characters of contentHtml (HTML-escaped plain text in a CDATA wrapper).
   */
  private buildDescription(article: Article): string {
    if (article.metaDescription) {
      return `<![CDATA[${article.metaDescription}]]>`;
    }

    if (article.contentHtml) {
      const plain = article.contentHtml
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const truncated = plain.length > 500 ? plain.substring(0, 500).replace(/\s+\S*$/, '') : plain;
      return `<![CDATA[${truncated}]]>`;
    }

    return '';
  }

  /**
   * Format a Date to RFC 2822 format (e.g. "Thu, 21 Dec 2023 12:00:00 +0000").
   */
  private formatRFC2822(date: Date): string {
    const dayName = DAY_NAMES[date.getUTCDay()];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = MONTH_NAMES[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
  }

  /**
   * Escape XML special characters in text content.
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default RSSFeed;
