'use client';

import { useCallback, useEffect, useState } from 'react';

interface TableOfContentsHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TableOfContentsHeading[];
  className?: string;
}

export default function TableOfContents({ headings, className = '' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    if (!headings || headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of headings) {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  if (!headings || headings.length === 0) {
    return null;
  }

  return (
    <nav className={className} aria-label="Table of contents">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
        On this page
      </h2>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li key={`${heading.id}-${heading.level}`}>
            <button
              onClick={() => handleClick(heading.id)}
              className={`block w-full text-left text-sm transition-colors hover:text-brand-600 ${
                heading.level === 3 ? 'pl-4' : ''
              } ${
                activeId === heading.id
                  ? 'font-medium text-brand-600 border-l-2 border-brand-600 pl-2'
                  : 'text-gray-500 border-l-2 border-transparent pl-2'
              }`}
              aria-current={activeId === heading.id ? 'page' : undefined}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
