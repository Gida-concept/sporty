import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { cache } from '../middleware/cache.js';
import prisma from '../lib/prisma.js';

// Category slug -> id cache (revalidated hourly)
const categoryIdCache = new Map<string, string>();
let categoryCacheTimestamp = 0;
const CATEGORY_CACHE_TTL = 3600_000; // 1 hour

async function getCategoryId(slug: string): Promise<string | null> {
  const now = Date.now();
  if (categoryCacheTimestamp && now - categoryCacheTimestamp < CATEGORY_CACHE_TTL) {
    return categoryIdCache.get(slug) ?? null;
  }
  // Refresh cache
  categoryIdCache.clear();
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  for (const cat of categories) {
    categoryIdCache.set(cat.slug, cat.id);
  }
  categoryCacheTimestamp = now;
  return categoryIdCache.get(slug) ?? null;
}

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
        const catId = await getCategoryId(category);
        if (catId !== null) {
          where.categoryId = catId;
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
