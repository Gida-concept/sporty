export default function ArticleLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
        {/* Main content skeleton */}
        <div>
          {/* Badge skeleton */}
          <div className="mb-4 h-6 w-20 rounded-full bg-gray-200 animate-pulse" />

          {/* Title skeleton */}
          <div className="mb-4 space-y-2">
            <div className="h-10 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-3/4 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Meta skeleton */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Featured image skeleton */}
          <div className="mb-8 aspect-video rounded-xl bg-gray-200 animate-pulse" />

          {/* Content blocks skeleton */}
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-11/12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Section heading skeleton */}
          <div className="mt-8 mb-4 h-8 w-48 rounded bg-gray-200 animate-pulse" />

          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-10/12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="mb-3 h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
