import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';

export interface QuotaInfo {
  daily: number;
  monthly: number;
  dailyLimit: number;
  monthlyLimit: number;
}

export class SerpApiQuotaService {
  /**
   * Get today's request count and the rolling 30-day total.
   * Returns zero counts if the DB is unreachable (fail open).
   */
  static async getQuotas(): Promise<QuotaInfo> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    try {
      const todayRecord = await prisma.serpApiQuota.findUnique({
        where: { date: today },
      });

      const monthlyAgg = await prisma.serpApiQuota.aggregate({
        _sum: { requestCount: true },
        where: {
          date: { gte: thirtyDaysAgo, lte: today },
        },
      });

      return {
        daily: todayRecord?.requestCount ?? 0,
        monthly: monthlyAgg._sum.requestCount ?? 0,
        dailyLimit: config.serpApiDailyLimit,
        monthlyLimit: config.serpApiMonthlyLimit,
      };
    } catch (err) {
      console.warn(
        '[SerpApiQuotaService] DB unreachable, returning zero quotas:',
        (err as Error).message,
      );
      return {
        daily: 0,
        monthly: 0,
        dailyLimit: config.serpApiDailyLimit,
        monthlyLimit: config.serpApiMonthlyLimit,
      };
    }
  }

  /**
   * Increment today's request count by 1.
   * Uses upsert so the first request of the day creates the row.
   * Failures are logged but swallowed (fail open).
   */
  static async increment(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
      await prisma.serpApiQuota.upsert({
        where: { date: today },
        update: { requestCount: { increment: 1 } },
        create: { date: today, requestCount: 1 },
      });
    } catch (err) {
      console.warn(
        '[SerpApiQuotaService] Failed to increment quota:',
        (err as Error).message,
      );
    }
  }

  /**
   * Check whether a new request can be made without exceeding
   * daily or monthly limits.
   *
   * Returns `true` (allow) if the DB is unreachable to avoid
   * blocking the content pipeline.
   */
  static async canMakeRequest(): Promise<boolean> {
    try {
      const { daily, monthly, dailyLimit, monthlyLimit } = await this.getQuotas();
      return daily < dailyLimit && monthly < monthlyLimit;
    } catch {
      // DB unreachable: fail open
      console.warn('[SerpApiQuotaService] DB unreachable, allowing request (fail open)');
      return true;
    }
  }
}
