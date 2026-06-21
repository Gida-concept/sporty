import Link from 'next/link';
import type { Metadata } from 'next';
import ArticleCard from '@/components/article/ArticleCard';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { getArticlesByTag } from '@/lib/api-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const tagLabel = tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${tagLabel} Articles`,
    description: `Browse all articles tagged with "${tagLabel}" on GameDayWire.`,
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const tagLabel = tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const result = await getArticlesByTag(tag).catch(() => null);
  const filtered = result?.data || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Tags', href: '/' }, { label: tagLabel }]}
        className="mb-6"
      />

      <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">{tagLabel}</h1>
      <p className="mb-8 text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} tagged with this topic
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard
              key={article.slug}
              article={{
                slug: article.slug,
                title: article.title,
                excerpt: article.excerpt,
                imageUrl: article.imageUrl,
                category: article.category,
                publishedAt: article.publishedAt,
                readTime: String(article.readTime),
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="mb-4 h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900">
            No articles found for tag &ldquo;{tagLabel}&rdquo;
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Try browsing{' '}
            <Link href="/category/sports" className="text-brand-600 hover:text-brand-700">
              Sports
            </Link>{' '}
            or{' '}
            <Link href="/category/entertainment" className="text-brand-600 hover:text-brand-700">
              Entertainment
            </Link>{' '}
            categories.
          </p>
        </div>
      )}
    </div>
  );
}
