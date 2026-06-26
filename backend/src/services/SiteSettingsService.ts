import prisma from '../lib/prisma.js';

class SiteSettingsService {
  private static instance: SiteSettingsService;

  private cache: Map<string, string> = new Map();
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  private constructor() {}

  static getInstance(): SiteSettingsService {
    if (!SiteSettingsService.instance) {
      SiteSettingsService.instance = new SiteSettingsService();
    }
    return SiteSettingsService.instance;
  }

  // ---------------------------------------------------------------------------
  // Cache management
  // ---------------------------------------------------------------------------

  invalidateCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }

  private isCacheValid(): boolean {
    return (
      this.cache.size > 0 &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS
    );
  }

  private async ensureCacheLoaded(): Promise<void> {
    if (this.isCacheValid()) return;
    try {
      const settings = await prisma.siteSetting.findMany();
      this.cache.clear();
      for (const s of settings) {
        if (s.key) {
          this.cache.set(s.key, s.value ?? '');
        }
      }
    } catch (err: unknown) {
      // Gracefully handle the case where the SiteSetting table doesn't exist yet
      // (e.g. before prisma migrate deploy has run on first deploy).
      // Prisma error code P2021 = "The table does not exist in the current database."
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2021') {
        console.warn('[SiteSettings] SiteSetting table not found, using defaults until migrations are applied.');
        this.cache.clear();
      } else {
        throw err;
      }
    }
    this.cacheTimestamp = Date.now();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async getAllSettings(): Promise<Record<string, string>> {
    await this.ensureCacheLoaded();
    const result: Record<string, string> = {};
    for (const [key, value] of this.cache) {
      result[key] = value;
    }
    return result;
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    this.invalidateCache();
  }

  async getSetting(key: string): Promise<string | null> {
    await this.ensureCacheLoaded();
    const val = this.cache.get(key);
    return val !== undefined ? val : null;
  }

  async getIntSetting(key: string, defaultVal: number): Promise<number> {
    const val = await this.getSetting(key);
    if (val === null) return defaultVal;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultVal : parsed;
  }

  async getBoolSetting(key: string, defaultVal: boolean): Promise<boolean> {
    const val = await this.getSetting(key);
    if (val === null) return defaultVal;
    return val === 'true' || val === '1';
  }

  // ---------------------------------------------------------------------------
  // Typed helpers for commonly used settings
  // ---------------------------------------------------------------------------

  async getSiteUrl(): Promise<string> {
    return (await this.getSetting('site_url')) || 'http://localhost:3000';
  }

  async getCorsOrigin(): Promise<string> {
    return (await this.getSetting('cors_origin')) || 'http://localhost:3000';
  }
}

export default SiteSettingsService;
