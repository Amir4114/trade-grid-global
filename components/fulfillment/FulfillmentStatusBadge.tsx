import { Badge } from "@/components/ui/badge"
import type { FulfillmentOrderStatus } from "@/lib/database/types"
import { formatFulfillmentStatus } from "@/lib/fulfillment/ui"
import { cn } from "@/lib/utils"

const tones: Record<FulfillmentOrderStatus, string> = {
  opened: "border-sky-200 bg-sky-50 text-sky-800",
  in_production: "border-amber-200 bg-amber-50 text-amber-800",
  quality_check: "border-violet-200 bg-violet-50 text-violet-800",
  packaging: "border-orange-200 bg-orange-50 text-orange-800",
  ready_to_ship: "border-cyan-200 bg-cyan-50 text-cyan-800",
  shipped: "border-blue-200 bg-blue-50 text-blue-800",
  in_transit: "border-indigo-200 bg-indigo-50 text-indigo-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-900",
  cancelled: "border-neutral-300 bg-neutral-100 text-neutral-700",
  failed: "border-red-200 bg-red-50 text-red-800",
}

export function FulfillmentStatusBadge({
  status,
}: {
  status: FulfillmentOrderStatus
}) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", tones[status])}>
      {formatFulfillmentStatus(status)}
    </Badge>
  )
}
