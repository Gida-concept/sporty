import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { cache } from '../middleware/cache.js';
import RSSFeed from '../services/RSSFeed.js';
import prisma from '../lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });
const rssFeed = new RSSFeed(prisma);

router.get('/', rateLimiter, cache({ ttl: 1800 }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const category = req.query.category as string | undefined;

    let articles;
    if (category && category !== 'all') {
      articles = await prisma.article.findMany({
        where: {
          status: 'published',
          categories: { some: { category: { slug: category } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        include: {
          categories: { include: { category: true } },
        },
      });
    } else {
      articles = undefined; // Let RSSFeed.fetchArticles handle it
    }

    const xml = await rssFeed.generateFeed(articles ?? undefined, { limit });
    res.setHeader('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
