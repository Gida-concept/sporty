import Link from 'next/link';
import JsonLd from './JsonLd';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href
        ? { item: `${process.env.SITE_URL || 'http://localhost:3000'}${item.href}` }
        : {}),
    })),
  };

  return (
    <>
      <JsonLd schema={schema} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && (
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              {item.href ? (
                <Link href={item.href} className="hover:text-brand-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
