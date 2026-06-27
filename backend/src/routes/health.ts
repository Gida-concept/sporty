import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import prisma from '../lib/prisma.js';

const router: Router = Router();
// Fly.io health checks poll every 30s = 120 requests/hour minimum.
// Set limit to 500/hour to comfortably cover Fly.io health checks
// plus incidental client traffic, without opening a DOS vector.
const healthLimiter = createRateLimiter({ windowMs: 3600000, max: 500 });

// Track DB health asynchronously — never await a query in the health handler.
let dbStatus: 'ok' | 'error' | 'pending' = 'pending';
let dbLatency = 0;
let dbMessage = 'Not yet checked';

function checkDbHealth(): void {
  const start = Date.now();
  prisma.$queryRaw`SELECT 1`
    .then(() => {
      dbStatus = 'ok';
      dbLatency = Date.now() - start;
      dbMessage = 'Connection established successfully';
    })
    .catch(() => {
      dbStatus = 'error';
      dbLatency = Date.now() - start;
      dbMessage = 'Database connection failed';
    });
}

// Fire immediately so first health check has a result.
checkDbHealth();

// Re-check every 30 seconds so Fly.io sees fresh data.
setInterval(checkDbHealth, 30000);

router.get('/', healthLimiter, (_req: Request, res: Response, _next: NextFunction) => {
  res.json({
    success: true,
    status: 'healthy',
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
});

export default router;
