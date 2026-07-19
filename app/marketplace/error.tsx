"use client"

import { MarketplaceRouteError } from "@/components/marketplace/MarketplaceRouteError"

export default function MarketplaceError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <MarketplaceRouteError title="Marketplace unavailable" reset={reset} />
}
