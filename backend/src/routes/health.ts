import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import prisma from '../lib/prisma.js';

const router: Router = Router();
// Fly.io health checks poll every 30s = 120 requests/hour minimum.
// Set limit to 500/hour to comfortably cover Fly.io health checks
// plus incidental client traffic, without opening a DOS vector.
const healthLimiter = createRateLimiter({ windowMs: 3600000, max: 500 });

router.get('/', healthLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let dbStatus = 'ok';
    let dbMessage = 'Connection established successfully';
    let dbLatency = 0;

    // Check DB connectivity with ping
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'error';
      dbMessage = 'Database connection failed';
    }

    const overallStatus = dbStatus === 'ok' ? 'healthy' : 'critical';
    const httpStatus = dbStatus === 'ok' ? 200 : 503;

    res.status(httpStatus).json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
          message: dbMessage,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
