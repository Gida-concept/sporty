import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { adminAuth } from '@/middleware/adminAuth.js';
import AdminService from '@/services/AdminService.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });

router.get('/', adminAuth, rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminService = new AdminService(prisma);
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
