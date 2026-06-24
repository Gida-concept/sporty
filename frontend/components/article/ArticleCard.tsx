import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';

interface ArticleCardArticle {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: string;
  readTime: string;
}

interface ArticleCardProps {
  article: ArticleCardArticle;
  className?: string;
}

function categoryVariant(category: string): 'sports' | 'entertainment' | 'default' {
  const lower = category.toLowerCase();
  if (lower === 'sports') return 'sports';
  if (lower === 'entertainment') return 'entertainment';
  return 'default';
}

export default function ArticleCard({ article, className = '' }: ArticleCardProps) {
  const { slug, title, excerpt, imageUrl, category, publishedAt, readTime } = article;

  return (
    <Link
      href={`/article/${slug}`}
      className={`group block ${className}`}
      aria-label={`Read article: ${title}`}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-md h-full">
        <div className="aspect-video overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={categoryVariant(category)}>
                {category}
              </Badge>
              <span className="text-xs text-gray-400">{formatDate(publishedAt)}</span>
            </div>
            <h3 className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-brand-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{excerpt}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <svg
                className="h-3.5 w-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs text-gray-400">{readTime} min read</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
