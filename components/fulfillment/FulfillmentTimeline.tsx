import { CheckCircle2, MessageSquareText } from "lucide-react"

import type { FulfillmentOrderEvent } from "@/lib/database/types"
import {
  fulfillmentEventLabel,
  fulfillmentEventTime,
} from "@/lib/fulfillment/ui"

export function FulfillmentTimeline({
  events,
}: {
  events: FulfillmentOrderEvent[]
}) {
  const chronological = [...events].sort(
    (left, right) =>
      new Date(fulfillmentEventTime(left)).getTime() -
      new Date(fulfillmentEventTime(right)).getTime()
  )

  if (chronological.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        No fulfillment events have been recorded.
      </p>
    )
  }

  return (
    <ol className="relative ml-3 border-l border-neutral-200">
      {chronological.map((event) => {
        const isComment = event.event_type === "fulfillment.comment_added"
        const Icon = isComment ? MessageSquareText : CheckCircle2
        return (
          <li key={event.id} className="relative pb-7 pl-7 last:pb-0">
            <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-amber-700">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">
                  {fulfillmentEventLabel(event)}
                </h3>
                {event.message ? (
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    {event.message}
                  </p>
                ) : null}
                {event.from_status &&
                event.to_status &&
                event.from_status !== event.to_status ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    {event.from_status.replaceAll("_", " ")} →{" "}
                    {event.to_status.replaceAll("_", " ")}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-xs text-neutral-500">
                <time dateTime={fulfillmentEventTime(event)}>
                  {new Date(fulfillmentEventTime(event)).toLocaleString()}
                </time>
                <p className="mt-1 capitalize">{event.actor_type}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
