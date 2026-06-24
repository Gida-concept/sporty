import type { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: string;
  statusCode: number;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;
  negativeTtl?: number;
  key?: (req: Request) => string;
}

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 10_000;
const DEFAULT_TTL = 120; // seconds
const DEFAULT_NEGATIVE_TTL = 15; // seconds for non-2xx responses

function defaultKey(req: Request): string {
  return req.originalUrl;
}

function evictIfNeeded(): void {
  while (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

export function cache(options?: CacheOptions) {
  const { ttl = DEFAULT_TTL, negativeTtl = DEFAULT_NEGATIVE_TTL, key = defaultKey } = options ?? {};

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = key(req);
    const entry = store.get(cacheKey);

    if (entry) {
      const age = (Date.now() - entry.timestamp) / 1000;
      const effectiveTtl = entry.statusCode >= 200 && entry.statusCode < 300 ? ttl : negativeTtl;
      if (age < effectiveTtl) {
        res.setHeader('X-Cache', 'HIT');
        res.status(entry.statusCode);
        res.setHeader('Content-Type', 'application/json');
        res.send(entry.body);
        return;
      }

      store.delete(cacheKey);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      res.setHeader('X-Cache', 'MISS');

      evictIfNeeded();

      store.set(cacheKey, {
        body: JSON.stringify(body),
        statusCode: res.statusCode,
        timestamp: Date.now(),
      });

      return originalJson(body);
    };

    next();
  };
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
    }
  }
}

export function clearCache(): void {
  store.clear();
}
