export default function PublicCompanyLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-neutral-50">
      <div className="h-16 border-b border-neutral-200 bg-white" />
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-20 w-20 rounded-2xl bg-neutral-200" />
          <div className="mt-5 h-10 max-w-xl rounded bg-neutral-200" />
          <div className="mt-4 h-5 max-w-3xl rounded bg-neutral-100" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-40 rounded-xl bg-neutral-200" />
        ))}
      </div>
    </main>
  )
}
