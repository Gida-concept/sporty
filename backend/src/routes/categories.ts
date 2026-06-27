import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { cache } from '../middleware/cache.js';
import CategoryService from '../services/CategoryService.js';
import prisma from '../lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });

// ---------------------------------------------------------------------------
// GET / — List all categories with article count
// ---------------------------------------------------------------------------

router.get('/', rateLimiter, cache({ ttl: 3600 }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryService = new CategoryService(prisma);
    const categories = await categoryService.getAll();

    res.json({
      success: true,
      data: { categories },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
