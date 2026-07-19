export function MarketplaceGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <main className="min-h-screen animate-pulse bg-neutral-50">
      <div className="h-16 border-b border-neutral-200 bg-white" />
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="h-3 w-32 rounded bg-neutral-200" />
          <div className="mt-4 h-9 max-w-xl rounded bg-neutral-200" />
          <div className="mt-3 h-5 max-w-3xl rounded bg-neutral-100" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="h-80 rounded-xl border border-neutral-200 bg-white"
          />
        ))}
      </div>
    </main>
  )
}
