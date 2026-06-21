import ArticleCard from './ArticleCard';

interface RelatedArticle {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: string;
  readTime: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  className?: string;
}

export default function RelatedArticles({ articles, className = '' }: RelatedArticlesProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Related Articles</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
