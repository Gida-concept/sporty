import Link from 'next/link';
import AdSlot from '@/components/ui/AdSlot';
import { getTrendingArticles } from '@/lib/api-client';
import NewsletterSubscribe from '@/components/layout/NewsletterSubscribe';

export default async function Sidebar() {
  const trending = await getTrendingArticles(5).catch(() => []);

  return (
    <aside className="space-y-8">
      {/* Trending Now */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Trending Now</h3>
        {trending.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {trending.map((article, i) => (
              <li key={article.id}>
                <Link
                  href={`/article/${article.slug}`}
                  className="group flex items-start gap-3"
                >
                  <span className="mt-0.5 text-sm font-bold text-brand-600">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700 transition-colors group-hover:text-brand-600">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {article.pageviews.toLocaleString()} views
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No trending articles yet.</p>
        )}
      </div>

      {/* Ad slot */}
      <AdSlot slotId="sidebar-1" format="rectangle" />

      {/* Stay Updated */}
      <NewsletterSubscribe />

      {/* Bottom ad slot */}
      <AdSlot slotId="sidebar-2" format="rectangle" />
    </aside>
  );
}
