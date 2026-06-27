import Link from 'next/link';
import type { Metadata } from 'next';
import ArticleCard from '@/components/article/ArticleCard';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import CategoryHero from '@/components/layout/CategoryHero';
import Sidebar from '@/components/layout/Sidebar';
import { getArticles } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sports',
};

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const pageSize = 12;

  const result = await getArticles({ category: 'sports', page: currentPage, pageSize }).catch(
    () => null,
  );
  const pageArticles = result?.data || [];
  const totalPages = result?.pagination.totalPages || 1;

  return (
    <>
      <CategoryHero
        title="Sports"
        description="Latest sports news, analysis, and trending topics."
        backgroundImage="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1500&q=80"
        articleCount={result?.pagination.totalItems || 0}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
          <div>
            <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sports' }]} className="mb-6" />

            <h1 className="mb-8 text-3xl font-bold text-gray-900 sm:text-4xl">Sports</h1>

            {/* Article grid */}
            {pageArticles.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {pageArticles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-gray-500">
                No articles found on this page. Please try a different page.
              </p>
            )}

            {/* Pagination */}
            <nav className="mt-12 flex items-center justify-center gap-1" aria-label="Pagination">
              {/* Previous */}
              <Link
                href={currentPage > 1 ? `/category/sports?page=${currentPage - 1}` : '#'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  currentPage <= 1
                    ? 'pointer-events-none text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Previous page"
                tabIndex={currentPage <= 1 ? -1 : 0}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/category/sports?page=${page}`}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Link>
              ))}

              {/* Next */}
              <Link
                href={currentPage < totalPages ? `/category/sports?page=${currentPage + 1}` : '#'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  currentPage >= totalPages
                    ? 'pointer-events-none text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Next page"
                tabIndex={currentPage >= totalPages ? -1 : 0}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </nav>
          </div>

          <aside className="hidden lg:flex lg:flex-col lg:gap-8">
            <Sidebar />
          </aside>
        </div>
      </div>
    </>
  );
}
