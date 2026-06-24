import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { clearCache } from '../middleware/cache.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });

router.post('/', rateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify HMAC-SHA256 signature
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) {
      throw new AppError('E010', 'Missing X-Webhook-Signature header', 401);
    }

    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('E010', 'Invalid webhook signature', 401);
    }

    const event = req.body.event as string;
    const source = (req.body.source as string) || 'unknown';

    if (!event) {
      throw new AppError('E012', 'Missing event field in webhook body', 400);
    }

    let actionTaken = 'logged';

    // Handle supported events
    switch (event) {
      case 'rate_limit_warning':
        actionTaken = 'logged_and_notified';
        await prisma.systemLog.create({
          data: {
            logType: 'webhook_rate_limit',
            message: `Rate limit warning received from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'warning',
          },
        });
        break;

      case 'monitor_down':
        actionTaken = 'alert_logged';
        await prisma.systemLog.create({
          data: {
            logType: 'monitor_alert',
            message: `Monitor DOWN alert from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'error',
          },
        });
        break;

      case 'monitor_up':
        actionTaken = 'recovery_logged';
        await prisma.systemLog.create({
          data: {
            logType: 'monitor_recovery',
            message: `Monitor UP recovery from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'info',
          },
        });
        break;

      case 'clear_cache':
        clearCache();
        actionTaken = 'cache_cleared';
        await prisma.systemLog.create({
          data: {
            logType: 'cache_clear',
            message: `Cache cleared via webhook from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'info',
          },
        });
        break;

      case 'regenerate_sitemap':
        actionTaken = 'sitemap_regeneration_triggered';
        await prisma.systemLog.create({
          data: {
            logType: 'sitemap_regenerate',
            message: `Sitemap regeneration triggered via webhook from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'info',
          },
        });
        break;

      case 'run_audit':
        actionTaken = 'seo_audit_triggered';
        await prisma.systemLog.create({
          data: {
            logType: 'seo_audit',
            message: `SEO audit triggered via webhook from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'info',
          },
        });
        break;

      case 'test_webhook':
        actionTaken = 'test_received';
        break;

      default:
        actionTaken = 'unknown_event_logged';
        await prisma.systemLog.create({
          data: {
            logType: 'webhook_unknown',
            message: `Unknown webhook event "${event}" from ${source}`,
            metadata: JSON.stringify(req.body),
            severity: 'warning',
          },
        });
        break;
    }

    res.json({
      success: true,
      data: {
        event_received: event,
        source,
        action_taken: actionTaken,
        message: 'Webhook processed',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
