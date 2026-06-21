'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleTable from '@/components/admin/ArticleTable';
import Button from '@/components/ui/Button';
import { deleteArticle, getArticles } from '@/lib/admin-api';

export default function AdminArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters: Record<string, string | number> = { page, limit: 10 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      const result = await getArticles(filters);
      setArticles(result.data || result.articles || []);
      setTotalPages(result.totalPages || Math.ceil((result.total || 0) / 10) || 1);
    } catch (err) {
      setError('Failed to load articles.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteArticle(String(id));
      fetchArticles();
    } catch (err) {
      setError('Failed to delete article.');
    }
  }

  function handleEdit(id: number) {
    router.push(`/admin/articles/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <span className="text-sm text-gray-500">
          {articles.length > 0 ? `${articles.length} articles` : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'published', 'draft', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12">
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <Button variant="primary" onClick={fetchArticles}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <ArticleTable articles={articles} onEdit={handleEdit} onDelete={handleDelete} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-[32px] rounded-lg px-2 text-sm font-medium transition-colors ${
                        page === p
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
