import { PrismaClient, PageView, SeoMetric } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyMetrics {
  articlesTracked: number;
  totalPageViews: number;
  uniqueVisitors: number;
}

export interface DashboardMetrics {
  totalArticles: number;
  totalPageViews: number;
  totalUniqueVisitors: number;
  avgTimeOnPage: number | null;
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    pageviews: number;
  }>;
  publishedCount: number;
  draftCount: number;
}

export interface ArticleMetrics {
  totalPageViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number | null;
  seoHistory: SeoMetric[];
  dailyViews: Array<{
    date: Date;
    pageviews: number;
  }>;
}

// ---------------------------------------------------------------------------
// MetricsCollector
// ---------------------------------------------------------------------------

class MetricsCollector {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Aggregate yesterday's page-view metrics across all articles.
   * Returns total page views, unique visitors, and the count of articles that
   * received at least one view.
   */
  async aggregateDailyMetrics(): Promise<DailyMetrics> {
    const { start, end } = this.getYesterday();

    const aggregation = await this.prisma.pageView.aggregate({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        pageviews: true,
        uniqueVisitors: true,
      },
    });

    const articlesWithViews = await this.prisma.pageView.count({
      where: {
        date: {
          gte: start,
          lt: end,
        },
        pageviews: { gt: 0 },
      },
    });

    return {
      articlesTracked: articlesWithViews,
      totalPageViews: aggregation._sum.pageviews ?? 0,
      uniqueVisitors: aggregation._sum.uniqueVisitors ?? 0,
    };
  }

  /**
   * Get dashboard-level metrics for a given lookback period.
   * Returns article counts by status, aggregated page views, average time on
   * page for published articles, and the top 10 articles by page views within
   * the period.
   */
  async getDashboardMetrics(period: '24h' | '7d' | '30d' | '90d'): Promise<DashboardMetrics> {
    const { start, end } = this.getPeriodDateRange(period);

    // ---- Article counts by status ----
    const [totalArticles, publishedCount, draftCount] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: 'published' } }),
      this.prisma.article.count({ where: { status: 'draft' } }),
    ]);

    // ---- PageView aggregation within the period ----
    const pageViewAgg = await this.prisma.pageView.aggregate({
      where: {
        date: { gte: start, lt: end },
      },
      _sum: {
        pageviews: true,
        uniqueVisitors: true,
      },
    });

    // ---- Average time on page (published articles only) ----
    const avgTimeResult = await this.prisma.article.aggregate({
      where: { status: 'published' },
      _avg: { avgTimeOnPage: true },
    });

    // ---- Top 10 articles by total page views within the period ----
    const pageViewGroups = await this.prisma.pageView.groupBy({
      by: ['articleId'],
      where: {
        date: { gte: start, lt: end },
      },
      _sum: {
        pageviews: true,
      },
      orderBy: {
        _sum: {
          pageviews: 'desc',
        },
      },
      take: 10,
    });

    const articleIds = pageViewGroups.map((g) => g.articleId);
    const articles =
      articleIds.length > 0
        ? await this.prisma.article.findMany({
            where: { id: { in: articleIds } },
            select: { id: true, title: true, slug: true },
          })
        : [];

    const topArticles = pageViewGroups.map((group) => {
      const article = articles.find((a) => a.id === group.articleId);
      return {
        id: group.articleId,
        title: article?.title ?? 'Unknown',
        slug: article?.slug ?? 'unknown',
        pageviews: group._sum.pageviews ?? 0,
      };
    });

    return {
      totalArticles,
      totalPageViews: pageViewAgg._sum.pageviews ?? 0,
      totalUniqueVisitors: pageViewAgg._sum.uniqueVisitors ?? 0,
      avgTimeOnPage: avgTimeResult._avg.avgTimeOnPage ?? null,
      topArticles,
      publishedCount,
      draftCount,
    };
  }

  /**
   * Get per-article metrics including total page views, unique visitors, SEO
   * history, and daily view breakdown.
   */
  async getArticleMetrics(articleId: string): Promise<ArticleMetrics> {
    const [pageViewAgg, seoHistory, dailyViews, article] = await Promise.all([
      this.prisma.pageView.aggregate({
        where: { articleId },
        _sum: {
          pageviews: true,
          uniqueVisitors: true,
        },
      }),
      this.prisma.seoMetric.findMany({
        where: { articleId },
        orderBy: { trackedAt: 'desc' },
      }),
      this.prisma.pageView.findMany({
        where: { articleId },
        select: { date: true, pageviews: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.article.findUnique({
        where: { id: articleId },
        select: { avgTimeOnPage: true },
      }),
    ]);

    return {
      totalPageViews: pageViewAgg._sum.pageviews ?? 0,
      uniqueVisitors: pageViewAgg._sum.uniqueVisitors ?? 0,
      avgTimeOnPage: article?.avgTimeOnPage ?? null,
      seoHistory,
      dailyViews,
    };
  }

  /**
   * Record a page view for the given article on today's date.
   * Upserts the PageView row keyed on (articleId, date) to increment the daily
   * counter, and also increments the article-level lifetime pageviews counter.
   */
  async recordPageView(articleId: string, _referrer?: string): Promise<PageView> {
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
  }

  // -----------------------------------------------------------------------
  // Date helpers
  // -----------------------------------------------------------------------

  /**
   * Return the start-of-day boundaries for yesterday.
   * The returned `start` is 00:00:00.000 UTC yesterday; `end` is 00:00:00.000
   * UTC today (exclusive bound).
   */
  private getYesterday(): { start: Date; end: Date } {
    const end = this.getStartOfToday();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 1);
    return { start, end };
  }

  /**
   * Return the start-of-day boundaries for a given lookback period.
   * The returned `start` is 00:00:00.000 UTC N days ago; `end` is 00:00:00.000
   * UTC today (exclusive bound).
   */
  private getPeriodDateRange(period: string): { start: Date; end: Date } {
    const end = this.getStartOfToday();

    const start = new Date(end);
    switch (period) {
      case '24h':
        start.setUTCDate(start.getUTCDate() - 1);
        break;
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
        start.setUTCDate(start.getUTCDate() - 7);
        break;
    }

    return { start, end };
  }

  /**
   * Get the start of today (00:00:00.000 UTC) as a Date.
   */
  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
  }
}

export default MetricsCollector;
