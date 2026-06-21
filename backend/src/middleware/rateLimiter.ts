import type { Request, Response, NextFunction } from 'express';

interface RateLimiterEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  statusCode?: number;
}

const store = new Map<string, RateLimiterEntry>();

const CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function createRateLimiter(options?: RateLimiterOptions) {
  const {
    windowMs = 60_000,
    max = 60,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options ?? {};

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'E001',
          message,
          retryAfter,
        },
      });
      return;
    }

    next();
  };
}
