'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);
    pages.push(1);
    if (rangeStart > 2) pages.push('ellipsis');
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`} aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Previous page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPageNumbers().map((page, idx) =>
        page === 'ellipsis' ? (
          <span
            key={`e-${idx}`}
            className="inline-flex h-9 w-9 items-center justify-center text-sm text-gray-400"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Next page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
