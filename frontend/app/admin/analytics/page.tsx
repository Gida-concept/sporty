'use client';

import { useEffect, useState } from 'react';
import AnalyticsChart from '@/components/admin/AnalyticsChart';
import StatsCard from '@/components/admin/StatsCard';
import { Button } from '@/components/ui/button';
import { getAnalytics } from '@/lib/admin-api';
import { formatCompactNumber } from '@/lib/formatters';

interface AnalyticsDataPoint {
  date: string;
  pageviews: number;
}

interface AnalyticsSummary {
  total: number;
  avgDaily: number;
  topDay: { date: string; pageviews: number };
}

interface TopArticle {
  title: string;
  pageviews?: number;
  count?: number;
  id?: number;
}

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [chartData, setChartData] = useState<AnalyticsDataPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    total: 0,
    avgDaily: 0,
    topDay: { date: '', pageviews: 0 },
  });
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError('');
      try {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - parseInt(dateRange));

        const result = await getAnalytics({
          from: from.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0],
          granularity,
        });

        // Backend envelope: { success, data: { time_series, summary, top_articles }, timestamp }
        const responseData = result.data || {};
        const series: AnalyticsDataPoint[] = responseData.time_series || [];
        setChartData(series);

        // Compute summary
        const values = series.map((d) => d.pageviews || 0);
        const total = values.reduce((a: number, b: number) => a + b, 0);
        const avgDaily = series.length > 0 ? Math.round(total / series.length) : 0;
        const maxVal = Math.max(...values, 0);
        const maxIdx = values.indexOf(maxVal);
        const topDayVal: { date: string; pageviews: number } =
          maxIdx >= 0
            ? { date: series[maxIdx]?.date || '', pageviews: maxVal }
            : { date: '', pageviews: 0 };

        setSummary({ total, avgDaily, topDay: topDayVal });
        setTopArticles(responseData.top_articles || []);
      } catch {
        setError('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, [dateRange, granularity]);

  const rangeOptions = [
    { value: '7d' as const, label: '7 Days' },
    { value: '30d' as const, label: '30 Days' },
    { value: '90d' as const, label: '90 Days' },
  ];

  const granularityOptions = [
    { value: 'day' as const, label: 'Day' },
    { value: 'week' as const, label: 'Week' },
    { value: 'month' as const, label: 'Month' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                dateRange === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {granularityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGranularity(opt.value)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                granularity === opt.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-[300px] animate-pulse rounded-xl bg-white" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12">
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12">
          <svg
            className="mb-4 h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-900">No analytics data yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Data will appear once articles start receiving traffic.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <AnalyticsChart data={chartData} height={300} />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              label="Total Pageviews"
              value={formatCompactNumber(summary.total)}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              }
            />
            <StatsCard
              label="Avg. Daily Pageviews"
              value={formatCompactNumber(summary.avgDaily)}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
            />
            <StatsCard
              label="Top Day"
              value={`${formatCompactNumber(summary.topDay.pageviews)}`}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 11l7-7 7 7M5 19l7-7 7 7"
                  />
                </svg>
              }
            />
          </div>

          {/* Top Articles */}
          {topArticles.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Articles</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Pageviews
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topArticles.map((article: TopArticle, idx: number) => (
                      <tr key={article.id || idx} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {article.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {formatCompactNumber(article.pageviews || article.count || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
