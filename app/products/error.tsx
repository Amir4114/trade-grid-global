"use client"

import { MarketplaceRouteError } from "@/components/marketplace/MarketplaceRouteError"

export default function ProductsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <MarketplaceRouteError title="Products unavailable" reset={reset} />
}
