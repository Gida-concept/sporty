import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { adminAuth } from '../../middleware/adminAuth.js';
import AnalyticsService from '../../services/AnalyticsService.js';
import prisma from '../../lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });

// ---------------------------------------------------------------------------
// GET / — Analytics time-series data
// ---------------------------------------------------------------------------

router.get('/', adminAuth, rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const startDateParam = req.query.start_date as string | undefined;
    const endDateParam = req.query.end_date as string | undefined;

    const startDate = startDateParam ? new Date(startDateParam) : thirtyDaysAgo;
    const endDate = endDateParam ? new Date(endDateParam) : now;

    const granularityParam = (req.query.granularity as string) || 'day';
    const granularity = ['day', 'week', 'month'].includes(granularityParam)
      ? (granularityParam as 'day' | 'week' | 'month')
      : 'day';

    const analyticsService = new AnalyticsService(prisma);

    const timeSeries = await analyticsService.getTimeSeries({
      startDate,
      endDate,
      granularity,
    });

    const topArticles = await analyticsService.getTopArticles('30d', 10);

    // Compute summary totals
    const totalPageviews = timeSeries.reduce((sum, point) => sum + point.pageviews, 0);

    res.json({
      success: true,
      data: {
        time_series: timeSeries,
        summary: {
          total_pageviews: totalPageviews,
          total_entries: timeSeries.length,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          granularity,
        },
        top_articles: topArticles,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
