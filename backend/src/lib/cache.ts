import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.resolve('/tmp', 'cache.json');
const DEFAULT_MAX_DAILY = 8;
const DEFAULT_MAX_MONTHLY = 240;

interface CacheEntry {
  data: unknown;
  expires: number;
}

interface CacheStore {
  entries: Record<string, CacheEntry>;
  quota: Record<string, number>; // keyed by date string "2026-06-20"
}

class DiskCache {
  private _cache: CacheStore;
  private _dirty: boolean = false;

  constructor() {
    this._cache = this._load();
    // Auto-save periodically and on exit
    setInterval(() => { this._save().catch(() => {}); }, 30_000);
    const cleanup = () => { this._save().catch(() => {}); };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(); });
    process.on('SIGTERM', () => { cleanup(); process.exit(); });
  }

  get<T>(key: string): T | null {
    const entry = this._cache.entries[key];
    if (!entry || entry.expires < Date.now()) {
      if (entry) delete this._cache.entries[key]; // cleanup expired
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlMs: number): void {
    this._cache.entries[key] = { data, expires: Date.now() + ttlMs };
    this._dirty = true;
  }

  getDailyUsage(): number {
    const today = new Date().toISOString().split('T')[0];
    return this._cache.quota[today] ?? 0;
  }

  getMonthlyUsage(): number {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      total += this._cache.quota[key] ?? 0;
    }
    return total;
  }

  canMakeRequest(maxDaily?: number, maxMonthly?: number): boolean {
    const d = maxDaily ?? DEFAULT_MAX_DAILY;
    const m = maxMonthly ?? DEFAULT_MAX_MONTHLY;
    return this.getDailyUsage() < d && this.getMonthlyUsage() < m;
  }

  incrementUsage(): void {
    const today = new Date().toISOString().split('T')[0];
    this._cache.quota[today] = (this._cache.quota[today] ?? 0) + 1;
    this._dirty = true;
  }

  getCacheStats(): { totalEntries: number; quotaToday: number; quotaMonthly: number } {
    return {
      totalEntries: Object.keys(this._cache.entries).length,
      quotaToday: this.getDailyUsage(),
      quotaMonthly: this.getMonthlyUsage(),
    };
  }

  private _load(): CacheStore {
    try {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw) as CacheStore;
    } catch {
      return { entries: {}, quota: {} };
    }
  }

  private async _save(): Promise<void> {
    if (!this._dirty) return;
    try {
      await fsp.writeFile(CACHE_FILE, JSON.stringify(this._cache, null, 0), 'utf-8');
      this._dirty = false;
    } catch (err) {
      console.error('[DiskCache] Failed to save:', err);
    }
  }
}

export const cache = new DiskCache();
export default DiskCache;
