import type { CronResult } from './types.js';

async function loadCronService() {
  return import('../backend/src/services/CronService.js');
}

export async function execute(dryRun: boolean = false): Promise<CronResult> {
  try {
    const { CronService } = await loadCronService();
    return await CronService.morningArticle({ dryRun });
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Morning article cron failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
