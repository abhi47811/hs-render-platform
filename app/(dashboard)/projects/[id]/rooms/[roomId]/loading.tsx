export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Breadcrumb skeleton */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-4 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-4 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-stone-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-stone-200 rounded animate-pulse" />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shell section */}
            <div className="rounded-lg border border-stone-200 bg-white p-6">
              <div className="h-6 w-32 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="h-64 bg-stone-200 rounded-lg animate-pulse" />
            </div>

            {/* Checkpoint section */}
            <div className="rounded-lg border border-stone-200 bg-white p-6">
              <div className="h-6 w-48 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="h-20 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="h-10 bg-stone-200 rounded animate-pulse" />
            </div>

            {/* Renders section */}
            <div className="rounded-lg border border-stone-200 bg-white p-6">
              <div className="h-6 w-32 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-40 bg-stone-200 rounded-lg animate-pulse" />
                <div className="h-40 bg-stone-200 rounded-lg animate-pulse" />
                <div className="h-40 bg-stone-200 rounded-lg animate-pulse" />
                <div className="h-40 bg-stone-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="h-6 w-40 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="rounded-lg border border-stone-200 bg-white h-96 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
