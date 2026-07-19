"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export function MarketplaceRouteError({
  title,
  reset,
}: {
  title: string
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Marketplace data could not be loaded. Retry or return to the
          marketplace overview.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/marketplace">Marketplace</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
