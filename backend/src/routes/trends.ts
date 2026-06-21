import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { cache } from '@/middleware/cache.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const limiter = createRateLimiter({ windowMs: 3600000, max: 100 });

router.get(
  '/',
  limiter,
  cache({ ttl: 10800 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = (req.query.category as string) || 'all';
      const limitParam = parseInt(req.query.limit as string, 10) || 20;
      const limit = Math.min(Math.max(1, limitParam), 100);
      const geo = req.query.geo as string | undefined;
      const minVolume = parseInt(req.query.min_volume as string, 10) || undefined;

      const where: Record<string, unknown> = {};

      if (category !== 'all') {
        const cat = await prisma.category.findUnique({ where: { slug: category } });
        if (cat) {
          where.categoryId = cat.id;
        }
      }

      if (geo) {
        where.geo = geo;
      }

      if (minVolume !== undefined && !isNaN(minVolume)) {
        where.searchVolume = { gte: minVolume };
      }

      const trends = await prisma.trend.findMany({
        where,
        orderBy: { trendScore: 'desc' },
        take: limit,
        include: { category: true },
      });

      res.json({
        success: true,
        data: {
          trends: trends.map((t) => {
            let parsedRelatedQueries = null;
            if (t.relatedQueries) {
              try {
                parsedRelatedQueries = JSON.parse(t.relatedQueries);
              } catch {
                parsedRelatedQueries = null;
              }
            }

            return {
              id: t.id,
              query: t.query,
              normalized_query: t.normalizedQuery,
              category: t.category.slug,
              search_volume: t.searchVolume,
              growth_rate: t.growthRate,
              geo: t.geo,
              trend_score: t.trendScore,
              fetched_at: t.fetchedAt.toISOString(),
              related_queries: parsedRelatedQueries,
            };
          }),
        },
        count: trends.length,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
