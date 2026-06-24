import { AppError } from '../middleware/errorHandler.js';
import { PrismaClient, Article } from '@prisma/client';

// ---- Constants

const DAYS_MS = 1000 * 60 * 60 * 24;
const STALE_DAYS = 30;
const HIGH_TRAFFIC_STALE_DAYS = 14;
const COMPLETE_REFRESH_DAYS = 90;
const POSITION_DROP_THRESHOLD = 10;
const SEO_REOPTIMIZE_THRESHOLD = 15;
const HIGH_TRAFFIC_THRESHOLD = 100;

// ---- ContentRefresher

class ContentRefresher {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Find stale published articles and return them prioritized by refresh need.
   * If allArticles is not provided, fetches published articles from the database.
   * Returns articles sorted by staleness: worst-ranked and oldest-refreshed first.
   */
  async findStaleArticles(allArticles?: Article[]): Promise<Article[]> {
    const articles =
      allArticles ??
      (await this.prisma.article.findMany({
        where: { status: 'published' },
      }));

    const stale = articles.filter((a) => this.shouldRefresh(a));

    // Sort by stale priority descending:
    // 1. Higher googlePosition (worse ranking) first, nulls last
    // 2. Older lastRefreshedAt first, nulls first
    // 3. Older createdAt as tiebreaker
    stale.sort((a, b) => {
      const posA = a.googlePosition ?? 999;
      const posB = b.googlePosition ?? 999;
      if (posA !== posB) {
        return posB - posA;
      }

      const refreshA = a.lastRefreshedAt?.getTime() ?? 0;
      const refreshB = b.lastRefreshedAt?.getTime() ?? 0;
      if (refreshA !== refreshB) {
        return refreshA - refreshB;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return stale;
  }

  /**
   * Determine whether an article needs refreshing based on age, last refresh
   * date, Google search position, and pageview traffic.
   *
   * Returns true if any of the following conditions are met:
   * - Never refreshed and older than 30 days
   * - Last refresh older than 30 days
   * - Google position dropped below top 10 (position > 10)
   * - High traffic (>100 pageviews) and last refresh older than 14 days
   */
  shouldRefresh(article: Article): boolean {
    const age = this.daysSince(article.createdAt ?? article.publishedAt);
    const daysSinceLastRefresh = this.daysSince(article.lastRefreshedAt);

    // Never refreshed and older than 30 days
    if (article.lastRefreshedAt === null && age > STALE_DAYS) {
      return true;
    }

    // Last refresh was more than 30 days ago
    if (article.lastRefreshedAt !== null && daysSinceLastRefresh > STALE_DAYS) {
      return true;
    }

    // Dropped out of top 10 Google positions
    if (article.googlePosition !== null && article.googlePosition > POSITION_DROP_THRESHOLD) {
      return true;
    }

    // High-traffic articles refresh more frequently (every 14 days)
    if (
      article.pageviews > HIGH_TRAFFIC_THRESHOLD &&
      article.lastRefreshedAt !== null &&
      daysSinceLastRefresh > HIGH_TRAFFIC_STALE_DAYS
    ) {
      return true;
    }

    return false;
  }

  /**
   * Analyze an article and generate structured refresh recommendations.
   * Checks age, Google position, and content indicators to determine
   * which sections need updating and the primary reason for refresh.
   *
   * Returns an object containing:
   * - shouldUpdate: whether a refresh is recommended
   * - sections: specific section names or actions to update
   * - reason: human-readable explanation for the recommendation
   */
  async generateRefreshGuide(article: Article): Promise<{
    shouldUpdate: boolean;
    sections: string[];
    reason: string;
  }> {
    const age = this.daysSince(article.createdAt ?? article.publishedAt);
    const daysSinceRefresh = this.daysSince(article.lastRefreshedAt);

    // ---- Age-based assessment: complete refresh for very old articles

    if (age > COMPLETE_REFRESH_DAYS) {
      const sections: string[] = [
        'Update statistics and data points with current figures',
        'Refresh all time-sensitive references and dates',
        'Review and update external source citations',
        'Add recent developments and context since original publication',
      ];

      const yearMatch = article.title?.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        sections.push(`Update title year reference "${yearMatch[1]}" to current year`);
      }

      return {
        shouldUpdate: true,
        sections,
        reason: `Article is ${Math.round(age)} days old and requires a complete refresh with updated statistics and data`,
      };
    }

    // ---- Position-based assessment: SEO re-optimization for dropped rankings

    if (article.googlePosition !== null && article.googlePosition > SEO_REOPTIMIZE_THRESHOLD) {
      return {
        shouldUpdate: true,
        sections: [
          'Re-optimize meta description and title tags for current search intent',
          'Update headings to better target primary and secondary keywords',
          'Add fresh internal links to newer related content',
          'Improve content depth and comprehensiveness to match top-ranking competitors',
          'Review and update schema markup for featured snippet opportunities',
        ],
        reason: `Article has dropped to position ${article.googlePosition} and needs SEO re-optimization`,
      };
    }

    // ---- Content-gap assessment: incremental update for moderately stale articles

    if (
      (article.lastRefreshedAt !== null && daysSinceRefresh > STALE_DAYS) ||
      (article.lastRefreshedAt === null && age > STALE_DAYS)
    ) {
      const sections: string[] = [
        'Refresh introductory paragraph for timeliness',
        'Add any new data or findings relevant to the topic',
        'Update FAQ section with emerging questions',
        'Verify and refresh external links for accuracy',
      ];

      // Content gap analysis from title
      if (article.title) {
        const yearMatch = article.title.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          sections.push(`Update time-sensitive references from ${yearMatch[1]}`);
        }

        if (
          article.title.toLowerCase().includes('guide') ||
          article.title.toLowerCase().includes('best')
        ) {
          sections.push('Review and update any product or service recommendations');
        }

        if (
          article.title.toLowerCase().includes('vs') ||
          article.title.toLowerCase().includes('comparison')
        ) {
          sections.push('Update comparison data with latest available figures');
        }

        if (
          article.title.toLowerCase().includes('how to') ||
          article.title.toLowerCase().includes('tutorial')
        ) {
          sections.push('Verify step-by-step instructions are still accurate');
          sections.push('Add any new methods or approaches that have emerged');
        }
      }

      return {
        shouldUpdate: true,
        sections,
        reason: `Article content is ${Math.round(daysSinceRefresh > STALE_DAYS ? daysSinceRefresh : age)} days old and needs incremental updates`,
      };
    }

    // ---- Default: no refresh needed

    return {
      shouldUpdate: false,
      sections: [],
      reason: 'Article is current and does not need refreshing',
    };
  }

  /**
   * Merge partial content updates into an existing article while preserving
   * critical fields that should not change after initial publication:
   * slug, externalLinks, internalLinks, publishedAt, keywordId, trendId.
   *
   * Sets lastRefreshedAt to the current timestamp automatically.
   * Returns the fully updated Article record from the database.
   */
  async mergeContent(
    original: Article,
    update: {
      title?: string;
      contentHtml?: string;
      contentBlocks?: string;
      metaDescription?: string;
      h1?: string;
    },
  ): Promise<Article> {
    if (original.id === undefined) {
      throw new AppError('E004', 'Cannot merge content: original article has no id');
    }

    const merged = await this.prisma.article.update({
      where: { id: original.id },
      data: {
        ...(update.title !== undefined && { title: update.title }),
        ...(update.contentHtml !== undefined && { contentHtml: update.contentHtml }),
        ...(update.contentBlocks !== undefined && { contentBlocks: update.contentBlocks }),
        ...(update.metaDescription !== undefined && { metaDescription: update.metaDescription }),
        ...(update.h1 !== undefined && { h1: update.h1 }),
        // slug, externalLinks, internalLinks, publishedAt, keywordId, trendId
        // are intentionally omitted — Prisma leaves them untouched
        lastRefreshedAt: new Date(),
      },
    });

    return merged;
  }

  /**
   * Calculate the number of days between a given date and the current time.
   * Returns Infinity for null or undefined dates to simplify staleness checks.
   */
  private daysSince(date: Date | null | undefined): number {
    if (date === null || date === undefined) {
      return Infinity;
    }
    const diff = Date.now() - date.getTime();
    return diff / DAYS_MS;
  }
}

export default ContentRefresher;
