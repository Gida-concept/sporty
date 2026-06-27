import type { CronResult } from './types.js';

async function loadCronService() {
  return import('../backend/src/services/CronService.js');
}

export async function execute(dryRun: boolean = false): Promise<CronResult> {
  try {
    const { CronService } = await loadCronService();
    return await CronService.sitemapGenerator({ dryRun });
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Sitemap generator cron failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
