import { PrismaClient, PageView } from '@prisma/client';
import { AppError } from '@/middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Granularity = 'day' | 'week' | 'month';

export interface TimeSeriesOptions {
  startDate: Date;
  endDate: Date;
  granularity: Granularity;
  articleId?: number;
}

export interface TimeSeriesPoint {
  date: string;
  pageviews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number | null;
}

export interface ArticleAnalytics {
  totalPageviews: number;
  totalUniqueVisitors: number;
  avgTimeOnPage: number | null;
  last30Days: {
    pageviews: number;
    uniqueVisitors: number;
  };
}

export interface TopArticle {
  id: number;
  title: string;
  slug: string;
  pageviews: number;
}

// ---------------------------------------------------------------------------
// AnalyticsService
// ---------------------------------------------------------------------------

class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Record (or increment) a page view for the given article on today's date.
   * Uses an upsert keyed on (articleId, date) to atomically increment the
   * daily counter. Also increments the article-level lifetime pageviews.
   *
   * Throws AppError E011 on failure.
   */
  async trackPageview(articleId: number, _referrer?: string): Promise<PageView> {
    try {
      const todayStart = this.getStartOfToday();

      // Upsert the daily PageView record
      const pageView = await this.prisma.pageView.upsert({
        where: {
          articleId_date: {
            articleId,
            date: todayStart,
          },
        },
        update: {
          pageviews: { increment: 1 },
        },
        create: {
          articleId,
          date: todayStart,
          pageviews: 1,
          uniqueVisitors: 0,
        },
      });

      // Increment the article-level lifetime pageviews counter
      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          pageviews: { increment: 1 },
        },
      });

      return pageView;
    } catch (err) {
      throw new AppError(
        'E011',
        `Failed to track pageview for article ${articleId}: ${(err as Error).message}`,
        500,
      );
    }
  }

  /**
   * Return pageview time-series data within the given date range, bucketed
   * by the requested granularity (day, week, or month).
   *
   * When granularity is 'day', each PageView row is returned as-is (one per
   * article-date). For 'week' and 'month', rows are aggregated via raw SQL
   * using SQLite's strftime function.
   */
  async getTimeSeries(options: TimeSeriesOptions): Promise<TimeSeriesPoint[]> {
    const { startDate, endDate, granularity, articleId } = options;

    const whereClause: Record<string, unknown> = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (articleId !== undefined) {
      whereClause.articleId = articleId;
    }

    if (granularity === 'day') {
      // Each PageView row is already per-day — just return as-is
      const rows = await this.prisma.pageView.findMany({
        where: whereClause,
        select: {
          date: true,
          pageviews: true,
          uniqueVisitors: true,
          avgTimeOnPage: true,
        },
        orderBy: { date: 'asc' },
      });

      return rows.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        pageviews: r.pageviews,
        uniqueVisitors: r.uniqueVisitors,
        avgTimeOnPage: r.avgTimeOnPage,
      }));
    }

    // Week or month granularity — aggregate using raw SQL
    const dateFormat = granularity === 'week' ? '%Y-%W' : '%Y-%m';

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        dateBucket: string;
        pageviews: number;
        uniqueVisitors: number;
        avgTimeOnPage: number | null;
      }>
    >(
      `SELECT
         strftime(?, date) AS dateBucket,
         SUM(pageviews) AS pageviews,
         SUM("uniqueVisitors") AS uniqueVisitors,
         AVG(avgTimeOnPage) AS avgTimeOnPage
       FROM PageView
       WHERE date >= ? AND date < ?
       ${articleId !== undefined ? 'AND articleId = ?' : ''}
       GROUP BY dateBucket
       ORDER BY dateBucket ASC`,
      dateFormat,
      startDate.toISOString(),
      endDate.toISOString(),
      ...(articleId !== undefined ? [articleId] : []),
    );

    return rows.map((r) => ({
      date: r.dateBucket,
      pageviews: Number(r.pageviews),
      uniqueVisitors: Number(r.uniqueVisitors),
      avgTimeOnPage: r.avgTimeOnPage != null ? Number(r.avgTimeOnPage) : null,
    }));
  }

  /**
   * Get comprehensive analytics for a single article: lifetime totals and a
   * 30-day breakdown.
   */
  async getArticleAnalytics(articleId: number): Promise<ArticleAnalytics> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, pageviews: true, avgTimeOnPage: true },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    // Lifetime aggregation from PageView table
    const lifetimeAgg = await this.prisma.pageView.aggregate({
      where: { articleId },
      _sum: {
        pageviews: true,
        uniqueVisitors: true,
      },
    });

    // 30-day aggregation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const last30Agg = await this.prisma.pageView.aggregate({
      where: {
        articleId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        pageviews: true,
        uniqueVisitors: true,
      },
    });

    return {
      totalPageviews: lifetimeAgg._sum.pageviews ?? 0,
      totalUniqueVisitors: lifetimeAgg._sum.uniqueVisitors ?? 0,
      avgTimeOnPage: article.avgTimeOnPage ?? null,
      last30Days: {
        pageviews: last30Agg._sum.pageviews ?? 0,
        uniqueVisitors: last30Agg._sum.uniqueVisitors ?? 0,
      },
    };
  }

  /**
   * Get the top N articles by pageviews within the given lookback period.
   * Period can be '7d', '30d', or '90d'. Defaults to top 10.
   */
  async getTopArticles(period: string, limit: number = 10): Promise<TopArticle[]> {
    const { start } = this.getPeriodDateRange(period);

    // Aggregate PageView totals per article for the period
    const pageViewGroups = await this.prisma.pageView.groupBy({
      by: ['articleId'],
      where: {
        date: { gte: start },
      },
      _sum: {
        pageviews: true,
      },
      orderBy: {
        _sum: {
          pageviews: 'desc',
        },
      },
      take: limit,
    });

    if (pageViewGroups.length === 0) {
      return [];
    }

    const articleIds = pageViewGroups.map((g) => g.articleId);
    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds } },
      select: { id: true, title: true, slug: true },
    });

    const articleMap = new Map(articles.map((a) => [a.id, a]));

    return pageViewGroups.map((group) => {
      const article = articleMap.get(group.articleId);
      return {
        id: group.articleId,
        title: article?.title ?? 'Unknown',
        slug: article?.slug ?? 'unknown',
        pageviews: group._sum.pageviews ?? 0,
      };
    });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Return the start-of-today as a Date set to 00:00:00.000 UTC.
   */
  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
  }

  /**
   * Return the start-of-period boundary for a given lookback string.
   * '7d' = 7 days ago, '30d' = 30 days ago, '90d' = 90 days ago.
   * Defaults to 30 days.
   */
  private getPeriodDateRange(period: string): { start: Date } {
    const end = this.getStartOfToday();
    const start = new Date(end);

    switch (period) {
      case '7d':
        start.setUTCDate(start.getUTCDate() - 7);
        break;
      case '30d':
        start.setUTCDate(start.getUTCDate() - 30);
        break;
      case '90d':
        start.setUTCDate(start.getUTCDate() - 90);
        break;
      default:
        start.setUTCDate(start.getUTCDate() - 30);
        break;
    }

    return { start };
  }
}

export default AnalyticsService;
