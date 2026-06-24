import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import SiteSettingsService from '@/services/SiteSettingsService.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 60000, max: 30 });

// GET /api/settings — Public settings (ad codes, header/body HTML, no auth required)
router.get('/', rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = SiteSettingsService.getInstance();
    const settings = await service.getAllSettings();
    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
