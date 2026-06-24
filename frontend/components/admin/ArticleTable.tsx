'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCompactNumber, formatDate } from '@/lib/formatters';

export interface AdminArticle {
  id: number;
  slug: string;
  title: string;
  status: string;
  word_count: number;
  quality_score: number;
  pageviews: number;
  google_position: number | null;
  published_at: string | null;
  updated_at: string;
}

interface ArticleTableProps {
  articles: AdminArticle[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  showActions?: boolean;
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    case 'archived':
      return 'default';
    default:
      return 'default';
  }
}

export default function ArticleTable({
  articles,
  onEdit,
  onDelete,
  showActions = true,
}: ArticleTableProps) {
  if (articles.length === 0) {
    return (
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
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-900">No articles found</p>
        <p className="mt-1 text-sm text-gray-500">
          Articles will appear here once they are created and published.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Words
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Quality
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Views
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Position
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Published
            </th>
            {showActions && (
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {articles.map((article) => (
            <tr key={article.id} className="transition-colors hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <p className="max-w-md truncate text-sm font-medium text-gray-900">
                  {article.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">/article/{article.slug}</p>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <Badge variant={getStatusBadgeVariant(article.status)}>{article.status}</Badge>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {article.word_count?.toLocaleString() || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {article.quality_score ?? '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {formatCompactNumber(article.pageviews || 0)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {article.google_position ?? '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {article.published_at ? formatDate(article.published_at) : '-'}
              </td>
              {showActions && (
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(article.id)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(article.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
