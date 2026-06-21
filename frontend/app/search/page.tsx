import { Suspense } from 'react';
import SearchResults from './SearchResults';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-4 h-48 rounded bg-gray-200" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </main>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
