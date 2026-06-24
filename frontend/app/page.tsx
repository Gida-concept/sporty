import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import ArticleCard from '@/components/article/ArticleCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getArticles, getTrends } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'Sports & Entertainment News — Latest Analysis and Trends',
};

export default async function HomePage() {
  const [articlesData, trendsData] = await Promise.all([
    getArticles({ pageSize: 12 }).catch(() => null),
    getTrends({ limit: 5 }).catch(() => null),
  ]);

  const articles = articlesData?.data || [];
  const trends = (trendsData || []).map((t) => ({
    term: t.query,
    score: Math.round(t.trendScore || 80),
  }));

  const featured = articles.length > 0 ? articles[0] : null;

  return (
    <div className="min-h-screen">
      {/* Hero Section — SI-Style Impact */}
      {featured ? (
        <section className="relative overflow-hidden bg-gray-900">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex min-h-[560px] items-end py-16 sm:py-24">
              {/* Background image with gradient overlay */}
              <div className="absolute inset-0">
                <Image
                  src={featured.imageUrl}
                  alt=""
                  fill
                  className="object-cover opacity-50"
                  priority
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
              </div>

              {/* Hero content */}
              <div className="relative max-w-3xl">
                <Badge variant="sports" className="mb-4">
                  {featured.category}
                </Badge>
                <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                  <Link
                    href={`/article/${featured.slug}`}
                    className="transition-colors hover:text-brand-400"
                  >
                    {featured.title}
                  </Link>
                </h1>
                <p className="mb-6 text-lg leading-relaxed text-gray-300 sm:text-xl">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatDate(featured.publishedAt)}</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {featured.readTime} min read
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Fallback hero when no articles */
        <section className="relative overflow-hidden bg-gray-900">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex min-h-[500px] items-end py-16 sm:py-24">
              <div className="relative">
                <h1 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome to GameDayWire
                </h1>
                <p className="mb-6 text-lg leading-relaxed text-gray-300">
                  Your source for the latest sports and entertainment news, analysis, and insights.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Latest Articles</h2>
          <Link
            href="/category/sports"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            View all &rarr;
          </Link>
        </div>
        {articles.length > 0 ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <li key={article.slug} className={index === 0 ? 'md:col-span-2' : ''}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-12 text-center text-gray-500">
            No articles published yet. Check back soon for the latest sports and entertainment
            coverage.
          </p>
        )}
      </section>

      {/* Trending Now */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">Trending Now</h2>
          {trends.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {trends.map((trend) => (
                <Card key={trend.term} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-900">{trend.term}</span>
                        <span className="ml-2 flex-shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {trend.score}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-brand-600"
                          style={{ width: `${trend.score}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No trending topics at the moment.</p>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">Explore by Category</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/category/sports" className="group relative overflow-hidden rounded-xl">
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gray-900">
              <Image
                src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80"
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-2xl font-bold text-white">Sports</h3>
              <p className="mt-1 text-sm text-gray-200">
                Latest scores, analysis, and breaking news
              </p>
            </div>
          </Link>
          <Link
            href="/category/entertainment"
            className="group relative overflow-hidden rounded-xl"
          >
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gray-900">
              <Image
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-2xl font-bold text-white">Entertainment</h3>
              <p className="mt-1 text-sm text-gray-200">Movies, music, gaming, and pop culture</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
