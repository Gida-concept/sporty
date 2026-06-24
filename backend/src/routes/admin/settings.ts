import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { adminAuth } from '@/middleware/adminAuth.js';
import SiteSettingsService from '@/services/SiteSettingsService.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });

// GET /api/admin/settings
router.get('/', adminAuth, rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = SiteSettingsService.getInstance();
    const settings = await service.getAllSettings();
    res.json({ success: true, data: settings, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

// PUT /api/admin/settings
router.put('/', adminAuth, rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = SiteSettingsService.getInstance();
    await service.updateSettings(req.body);
    const settings = await service.getAllSettings();
    res.json({ success: true, data: settings, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

export default router;
