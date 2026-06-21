import cron from 'node-cron';
import * as morningArticle from './morningArticle.js';
import * as eveningArticle from './eveningArticle.js';
import * as trendMonitor from './trendMonitor.js';
import * as keywordRefresh from './keywordRefresh.js';
import * as contentRefresh from './contentRefresh.js';
import * as sitemapGenerator from './sitemapGenerator.js';
import * as linkUpdate from './linkUpdate.js';
import * as seoAudit from './seoAudit.js';
import * as backup from './backup.js';

const scheduledTasks: cron.ScheduledTask[] = [];

export function start(): void {
  scheduledTasks.push(
    cron.schedule('0 8 * * *', () => {
      morningArticle.execute().catch(console.error);
    }),
    cron.schedule('0 19 * * *', () => {
      eveningArticle.execute().catch(console.error);
    }),
    cron.schedule('0 */3 * * *', () => {
      trendMonitor.execute().catch(console.error);
    }),
    cron.schedule('0 2 * * *', () => {
      keywordRefresh.execute().catch(console.error);
    }),
    cron.schedule('0 3 * * *', () => {
      contentRefresh.execute().catch(console.error);
    }),
    cron.schedule('0 1 * * *', () => {
      sitemapGenerator.execute().catch(console.error);
    }),
    cron.schedule('0 4 * * 0', () => {
      linkUpdate.execute().catch(console.error);
    }),
    cron.schedule('0 5 * * 0', () => {
      seoAudit.execute().catch(console.error);
    }),
    cron.schedule('0 6 * * 0', () => {
      backup.execute().catch(console.error);
    }),
  );
  console.log('[Cron] All 9 scheduled jobs registered');
}

export function stop(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  console.log('[Cron] All scheduled jobs stopped');
}
