'use client';

import { useMemo, useRef, useState } from 'react';

interface ChartDataPoint {
  date: string;
  pageviews: number;
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export default function AnalyticsChart({ data, height = 300 }: AnalyticsChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { pathD, xLabels, yLabels, points } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pathD: '', xLabels: [], yLabels: [], points: [] };
    }

    const values = data.map((d) => d.pageviews);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartHeight = height;
    const drawWidth = 800 - padding.left - padding.right;
    const drawHeight = chartHeight - padding.top - padding.bottom;

    const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * drawWidth;
    const yScale = (v: number) => padding.top + drawHeight - ((v - minVal) / range) * drawHeight;

    const pts = data.map((d, i) => ({ ...d, x: xScale(i), y: yScale(d.pageviews) }));

    let path = '';
    pts.forEach((p, i) => {
      if (i === 0) {
        path += `M ${p.x} ${p.y}`;
      } else {
        const prev = pts[i - 1];
        const cpx1 = prev.x + (p.x - prev.x) / 2;
        const cpy1 = prev.y;
        const cpx2 = prev.x + (p.x - prev.x) / 2;
        const cpy2 = p.y;
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p.x} ${p.y}`;
      }
    });

    const xLabelCount = Math.min(6, data.length);
    const xStep = Math.max(1, Math.floor(data.length / xLabelCount));
    const xLbls = data
      .filter((_, i) => i % xStep === 0 || i === data.length - 1)
      .map((d) => {
        const idx = data.indexOf(d);
        return { label: formatDateLabel(d.date), x: xScale(idx) };
      });

    const yStep = range / 4;
    const yLbls = Array.from({ length: 5 }, (_, i) => {
      const val = Math.round(minVal + yStep * i);
      return { label: val.toString(), y: yScale(val) };
    });

    return { pathD: path, xLabels: xLbls, yLabels: yLbls, points: pts };
  }, [data, height]);

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 800 ${height}`}
        className="w-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={60} y1={yl.y} x2={780} y2={yl.y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={55} y={yl.y + 4} textAnchor="end" className="fill-gray-400 text-xs">
              {yl.label}
            </text>
          </g>
        ))}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-gray-400 text-xs"
          >
            {xl.label}
          </text>
        ))}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {points.length > 0 && (
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${height - 40} L ${points[0].x} ${height - 40} Z`}
            fill="url(#areaGradient)"
          />
        )}
        <path
          d={pathD}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="white"
            stroke="#8b5cf6"
            strokeWidth={2}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, date: p.date, value: p.pageviews })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${(tooltip.x / 800) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <p className="text-xs text-gray-500">{formatDateLabel(tooltip.date)}</p>
          <p className="text-sm font-semibold text-gray-900">
            {tooltip.value.toLocaleString()} pageviews
          </p>
        </div>
      )}
    </div>
  );
}
