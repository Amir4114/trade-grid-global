import { Check } from "lucide-react"

import type { FulfillmentOrderStatus } from "@/lib/database/types"
import {
  activeFulfillmentPath,
  formatFulfillmentStatus,
  fulfillmentProgress,
} from "@/lib/fulfillment/ui"
import { cn } from "@/lib/utils"

export function FulfillmentProgress({
  status,
}: {
  status: FulfillmentOrderStatus
}) {
  const currentIndex = activeFulfillmentPath.indexOf(status)
  const terminalException = status === "cancelled" || status === "failed"

  return (
    <section aria-labelledby="fulfillment-progress-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="fulfillment-progress-title" className="text-lg font-semibold">
          Operational Progress
        </h2>
        <span className="text-sm font-semibold text-neutral-600 tabular-nums">
          {fulfillmentProgress(status)}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            terminalException ? "bg-red-500" : "bg-amber-500"
          )}
          style={{ width: `${fulfillmentProgress(status)}%` }}
        />
      </div>
      {!terminalException ? (
        <ol className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {activeFulfillmentPath.map((step, index) => {
            const complete = currentIndex >= index
            return (
              <li
                key={step}
                aria-current={index === currentIndex ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  complete ? "font-medium text-neutral-950" : "text-neutral-400"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    complete
                      ? "border-amber-500 bg-amber-500 text-neutral-950"
                      : "border-neutral-300 bg-white"
                  )}
                >
                  {complete ? <Check className="size-3" /> : index + 1}
                </span>
                {formatFulfillmentStatus(step)}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-red-700">
          This fulfillment ended as {formatFulfillmentStatus(status)}.
        </p>
      )}
    </section>
  )
}
