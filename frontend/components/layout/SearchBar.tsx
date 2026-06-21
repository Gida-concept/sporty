'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Search articles...',
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
}
