import type { ReactNode } from 'react';

interface TrendData {
  value: number;
  isPositive: boolean;
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: TrendData;
}

export default function StatsCard({ label, value, icon, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <svg
                className={`h-4 w-4 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={trend.isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
                />
              </svg>
              <span
                className={`text-sm font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-400">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
