import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ArticleBody from '@/components/article/ArticleBody';
import TableOfContents from '@/components/article/TableOfContents';
import FAQSection from '@/components/article/FAQSection';
import ShareButtons from '@/components/article/ShareButtons';
import RelatedArticles from '@/components/article/RelatedArticles';
import Badge from '@/components/ui/Badge';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import Sidebar from '@/components/layout/Sidebar';
import TrackPageview from '@/components/article/TrackPageview';
import AdSlot from '@/components/ui/AdSlot';
import { getArticleBySlug } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';

export const revalidate = 86400;

const DEFAULT_AUTHOR_IMAGE =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80';

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArticleBySlug(slug).catch(() => null);
  if (!result) return {};

  return {
    title: result.article.title,
    description: result.article.excerpt,
    openGraph: {
      title: result.article.title,
      description: result.article.excerpt,
      type: 'article',
      publishedTime: result.article.publishedAt,
      images: [{ url: result.article.imageUrl }],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getArticleBySlug(slug).catch(() => null);
  if (!result) notFound();

  const { article, relatedArticles, faqs, headings } = result;

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const articleUrl = `${siteUrl}/article/${article.slug}`;

  const badgeVariant = article.category.toLowerCase() === 'sports' ? 'sports' : 'entertainment';

  return (
    <>
      {/* JSON-LD Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt,
            image: article.imageUrl,
            datePublished: article.publishedAt,
            author: {
              '@type': 'Person',
              name: article.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'GameDayWire',
            },
          }),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: article.category, href: `/category/${article.category.toLowerCase()}` },
            { label: article.title },
          ]}
          className="mb-6"
        />

        {/* Two-column layout: main + sticky sidebar */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <article>
            <TrackPageview articleId={article.id} slug={article.slug} />
            {/* Header */}
            <Badge variant={badgeVariant} size="md" className="mb-4">
              {article.category}
            </Badge>
            <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <img
                  src={DEFAULT_AUTHOR_IMAGE}
                  alt={article.author}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="font-medium text-gray-700">{article.author}</span>
              </div>
              <span>{formatDate(article.publishedAt)}</span>
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {article.readTime} min read
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {article.pageviews.toLocaleString()} views
              </span>
            </div>

            {/* Featured image */}
            <div className="mb-8 overflow-hidden rounded-xl bg-gray-100">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="aspect-video h-full w-full object-cover"
              />
            </div>

            {/* Article body */}
            <ArticleBody blocks={article.contentBlocks} className="mb-10" />

            {/* FAQ */}
            {faqs.length > 0 && <FAQSection faqs={faqs} className="mb-10" />}

            {/* Share */}
            <ShareButtons url={articleUrl} title={article.title} className="mb-10" />
          </article>

          {/* Sidebar — Table of Contents + Trending */}
          <aside className="hidden lg:flex lg:flex-col lg:gap-8">
            {headings.length > 0 && <TableOfContents headings={headings} />}
            <AdSlot slotId="article-sidebar" format="rectangle" />
            <Sidebar />
          </aside>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <RelatedArticles
            articles={relatedArticles.map(
              ({ slug, title, excerpt, imageUrl, category, publishedAt, readTime }) => ({
                slug,
                title,
                excerpt,
                imageUrl,
                category,
                publishedAt,
                readTime,
              }),
            )}
            className="mt-12 border-t border-gray-200 pt-12"
          />
        )}
      </div>
    </>
  );
}
