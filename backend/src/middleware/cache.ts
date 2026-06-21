import type { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: string;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;
  key?: (req: Request) => string;
}

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 500;

function defaultKey(req: Request): string {
  return req.originalUrl;
}

export function cache(options?: CacheOptions) {
  const { ttl = 60, key = defaultKey } = options ?? {};

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = key(req);
    const entry = store.get(cacheKey);

    if (entry) {
      const age = (Date.now() - entry.timestamp) / 1000;
      if (age < ttl) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        res.send(entry.body);
        return;
      }

      store.delete(cacheKey);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      res.setHeader('X-Cache', 'MISS');

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (store.size >= MAX_ENTRIES) {
          const firstKey = store.keys().next().value;
          if (firstKey) {
            store.delete(firstKey);
          }
        }

        store.set(cacheKey, {
          body: JSON.stringify(body),
          timestamp: Date.now(),
        });
      }

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
