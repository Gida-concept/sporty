import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { cache } from '@/middleware/cache.js';
import prisma from '@/lib/prisma.js';

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
  cache({ ttl: 21600 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const headTerm = req.query.head_term as string | undefined;
      const limitParam = parseInt(req.query.limit as string, 10) || 50;
      const limit = Math.min(Math.max(1, limitParam), 200);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const sortBy = (req.query.sort_by as string) || 'priorityScore';
      const sortOrder = (req.query.sort_order as string) || 'desc';

      const where: Prisma.KeywordWhereInput = {};

      // Status filter: default 'approved', omit if 'all'
      if (statusFilter) {
        if (statusFilter !== 'all') {
          where.status = statusFilter;
        }
      } else {
        where.status = 'approved';
      }

      if (category) {
        const catId = await getCategoryId(category);
        if (catId !== null) {
          where.categoryId = catId;
        }
      }

      if (headTerm) {
        where.headTerm = { contains: headTerm };
      }

      const allowedSorts: Record<string, string> = {
        priorityScore: 'priorityScore',
        searchVolume: 'searchVolume',
        difficulty: 'difficulty',
        cpc: 'cpc',
        createdAt: 'createdAt',
      };
      const sortField = allowedSorts[sortBy] || 'priorityScore';
      const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

      const [keywords, total] = await Promise.all([
        prisma.keyword.findMany({
          where,
          orderBy: { [sortField]: orderDirection },
          take: limit,
          skip: offset,
          include: { category: true },
        }),
        prisma.keyword.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          keywords: keywords.map((k) => {
            let parsedSerpFeatures = null;
            if (k.serpFeatures) {
              try {
                parsedSerpFeatures = JSON.parse(k.serpFeatures);
              } catch {
                parsedSerpFeatures = null;
              }
            }

            return {
              id: k.id,
              keyword: k.keyword,
              head_term: k.headTerm,
              modifier: k.modifier,
              search_volume: k.searchVolume,
              difficulty: k.difficulty,
              cpc: k.cpc,
              intent: k.intent,
              category: k.category.slug,
              priority_score: k.priorityScore,
              serp_features: parsedSerpFeatures,
              status: k.status,
              times_targeted: k.timesTargeted,
              created_at: k.createdAt.toISOString(),
              last_validated_at: k.lastValidatedAt?.toISOString() ?? null,
            };
          }),
        },
        count: keywords.length,
        total,
        offset,
        limit,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
