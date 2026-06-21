'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ArticleCard from '@/components/article/ArticleCard';
import { getArticles } from '@/lib/api-client';
import type { Article } from '@/lib/api-client';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query.length < 2) {
      setLoading(false);
      setArticles([]);
      return;
    }
    setLoading(true);
    getArticles({ pageSize: 50 }).then((all) => {
      const q = query.toLowerCase();
      setArticles(
        all.data.filter(
          (a) => a.title.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q),
        ),
      );
      setLoading(false);
    });
  }, [query]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search results for &ldquo;{query}&rdquo;
        </h1>
        <p className="text-gray-500 mb-8">
          {articles.length} article{articles.length !== 1 ? 's' : ''} found
        </p>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-4 h-48 rounded bg-gray-200" />
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No articles found. Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
