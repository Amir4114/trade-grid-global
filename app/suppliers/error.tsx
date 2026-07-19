"use client"

import { MarketplaceRouteError } from "@/components/marketplace/MarketplaceRouteError"

export default function CompaniesError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <MarketplaceRouteError title="Companies unavailable" reset={reset} />
}
