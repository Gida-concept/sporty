import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import SitemapManager from '@/services/SitemapManager.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });
const sitemapManager = new SitemapManager(prisma);

router.get('/', rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = (req.query.type as string) || 'index';
    const page = parseInt(req.query.page as string, 10) || 1;

    let xml: string;
    if (type === 'articles') {
      xml = await sitemapManager.generateArticleSitemap(undefined, page);
    } else if (type === 'pages') {
      xml = await sitemapManager.generatePageSitemap();
    } else {
      xml = await sitemapManager.generateSitemapIndex();
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('X-Cache', 'MISS');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
