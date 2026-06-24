import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { adminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validator.js';
import { AppError } from '../../middleware/errorHandler.js';
import CategoryService from '../../services/CategoryService.js';
import prisma from '../../lib/prisma.js';

const router: Router = Router();
const listLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });
const writeLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });
const deleteLimiter = createRateLimiter({ windowMs: 3600000, max: 20 });

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// GET / — List all categories
// ---------------------------------------------------------------------------

router.get('/', adminAuth, listLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

// ---------------------------------------------------------------------------
// POST / — Create category
// ---------------------------------------------------------------------------

router.post(
  '/',
  adminAuth,
  writeLimiter,
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryService = new CategoryService(prisma);
      const category = await categoryService.create(req.body);

      res.status(201).json({
        success: true,
        data: { category },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id — Update category
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  adminAuth,
  writeLimiter,
  validate(updateCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError('E012', 'Invalid category ID', 400);
      }

      const categoryService = new CategoryService(prisma);
      const category = await categoryService.update(id, req.body);

      res.json({
        success: true,
        data: { category },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — Delete category
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  adminAuth,
  deleteLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError('E012', 'Invalid category ID', 400);
      }

      const reassignToId = req.query.reassign_to as string | undefined;

      const categoryService = new CategoryService(prisma);
      await categoryService.delete(id, reassignToId);

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
