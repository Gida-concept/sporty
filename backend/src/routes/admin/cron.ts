import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { adminAuth } from '../../middleware/adminAuth.js';
import CronService from '../../services/CronService.js';

const router: Router = Router();
const cronLimiter = createRateLimiter({ windowMs: 3600000, max: 20 });

// ---------------------------------------------------------------------------
// POST /morning-article — Trigger morning article generation
// Schedule: Daily 08:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/morning-article',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.morningArticle({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /evening-article — Trigger evening article generation
// Schedule: Daily 19:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/evening-article',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.eveningArticle({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /trend-monitor — Trigger trend discovery
// Schedule: Every 3 hours
// ---------------------------------------------------------------------------

router.post(
  '/trend-monitor',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.trendMonitor({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /keyword-refresh — Trigger keyword matrix regeneration
// Schedule: Daily 02:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/keyword-refresh',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.keywordRefresh({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /content-refresh — Trigger stale article refresh
// Schedule: Daily 03:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/content-refresh',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.contentRefresh({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /sitemap-generator — Trigger sitemap rebuild
// Schedule: Daily 01:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/sitemap-generator',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.sitemapGenerator({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /link-update — Trigger link graph rebuild
// Schedule: Weekly Sunday 04:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/link-update',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.linkUpdate({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /seo-audit — Trigger SEO audit
// Schedule: Weekly Sunday 05:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/seo-audit',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.seoAudit({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /backup — Trigger database backup
// Schedule: Weekly Sunday 06:00 UTC
// ---------------------------------------------------------------------------

router.post(
  '/backup',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const result = await CronService.backup({ dryRun });
      res.json({ success: result.success, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /run-all — Execute every cron job sequentially (for manual testing)
// ---------------------------------------------------------------------------

router.post(
  '/run-all',
  adminAuth,
  cronLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dryRun = req.query.dry_run === 'true';
      const results = await CronService.runAll({ dryRun });
      const allSucceeded = results.every((r) => r.success);
      res.status(allSucceeded ? 200 : 500).json({
        success: allSucceeded,
        data: { results },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
