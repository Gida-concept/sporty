import Link from 'next/link';

interface CategoryHeroProps {
  title: string;
  description: string;
  backgroundImage: string;
  articleCount?: number;
  className?: string;
}

export default function CategoryHero({
  title,
  description,
  backgroundImage,
  articleCount,
  className = '',
}: CategoryHeroProps) {
  return (
    <section
      className={`relative min-h-[280px] overflow-hidden sm:min-h-[360px] ${className}`}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto flex h-full min-h-[280px] max-w-7xl items-center px-4 sm:min-h-[360px] sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">{title}</h1>
          <p className="mt-3 text-lg text-gray-200 sm:text-xl">{description}</p>
          {articleCount !== undefined && (
            <Link
              href={`/category/${title.toLowerCase()}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              {articleCount} {articleCount === 1 ? 'article' : 'articles'}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
