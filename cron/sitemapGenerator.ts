import prisma from '../backend/src/lib/prisma.js';
import SitemapManager from '../backend/src/services/SitemapManager.js';
import type { CronResult, CronOptions } from './types.js';

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    const sitemapManager = new SitemapManager(prisma);

    // Generate sitemap
    const sitemap = await sitemapManager.generateSitemapIndex();
    const xmlContent = typeof sitemap === 'string' ? sitemap : JSON.stringify(sitemap);

    if (!dryRun) {
      // Ping search engines
      const siteUrl = process.env.SITE_URL || 'https://gamedaywire.com';
      const sitemapUrl = `${siteUrl}/sitemap.xml`;
      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
        fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
      ]);
    }

    return {
      success: true,
      exitCode: 0,
      message: `Sitemap generated${dryRun ? ' (dry-run)' : ''}`,
      details: { dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Sitemap generation failed: ${message}`,
      details: { error: message },
    };
  }
}
