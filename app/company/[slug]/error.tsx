"use client"

import { Button } from "@/components/ui/button"

export default function PublicCompanyError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Company profile unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          We could not load this public company profile. Please try again.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  )
}
