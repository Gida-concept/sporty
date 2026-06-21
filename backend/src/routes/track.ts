import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma.js';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { AppError } from '@/middleware/errorHandler.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 500 });

router.get('/', rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const articleId = parseInt(req.query.article_id as string, 10);
    const ref = (req.query.ref as string) || 'direct';

    // Validate article_id is a positive integer
    if (!articleId || isNaN(articleId) || articleId < 1) {
      throw new AppError('E012', 'article_id must be a valid positive integer', 400);
    }

    // Check that the article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    // Upsert PageView record
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    await prisma.pageView.upsert({
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
        uniqueVisitors: 1,
      },
    });

    // Increment article-level pageviews
    await prisma.article.update({
      where: { id: articleId },
      data: { pageviews: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        recorded: true,
        message: 'Page view recorded',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
