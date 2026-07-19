import type {
  FulfillmentOrderEvent,
  FulfillmentOrderStatus,
} from "@/lib/database/types"
import type { FulfillmentMilestoneType } from "@/lib/fulfillment/service"

export const fulfillmentStatuses: FulfillmentOrderStatus[] = [
  "opened",
  "in_production",
  "quality_check",
  "packaging",
  "ready_to_ship",
  "shipped",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "failed",
]

export const activeFulfillmentPath: FulfillmentOrderStatus[] = [
  "opened",
  "in_production",
  "quality_check",
  "packaging",
  "ready_to_ship",
  "shipped",
  "in_transit",
  "delivered",
  "completed",
]

export const fulfillmentStatusLabels: Record<FulfillmentOrderStatus, string> = {
  opened: "Created",
  in_production: "In Production",
  quality_check: "Quality Check",
  packaging: "Packaging",
  ready_to_ship: "Ready for Dispatch",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
}

export const milestoneOptions: Array<{
  value: FulfillmentMilestoneType
  label: string
}> = [
  { value: "container_loaded", label: "Container Loaded" },
  { value: "shipment_booked", label: "Shipment Booked" },
  { value: "departed_port", label: "Departed Port" },
  { value: "arrived_destination", label: "Arrived Destination" },
]

const supplementalByStatus: Partial<
  Record<FulfillmentOrderStatus, FulfillmentMilestoneType[]>
> = {
  opened: ["shipment_booked"],
  in_production: ["shipment_booked"],
  quality_check: ["shipment_booked"],
  packaging: ["shipment_booked"],
  ready_to_ship: ["shipment_booked", "container_loaded"],
  shipped: ["shipment_booked", "container_loaded", "departed_port"],
  in_transit: [
    "shipment_booked",
    "container_loaded",
    "departed_port",
    "arrived_destination",
  ],
  delivered: [
    "shipment_booked",
    "container_loaded",
    "departed_port",
    "arrived_destination",
  ],
}

export function availableSupplementalMilestones(
  status: FulfillmentOrderStatus,
  recorded: FulfillmentMilestoneType[]
) {
  const allowed = supplementalByStatus[status] ?? []
  return milestoneOptions.filter(
    (option) =>
      allowed.includes(option.value) && !recorded.includes(option.value)
  )
}

const eventLabels: Record<string, string> = {
  "fulfillment.opened": "Fulfillment Created",
  "fulfillment.production_started": "Production Started",
  "fulfillment.production_paused": "Production Paused",
  "fulfillment.production_resumed": "Production Resumed",
  "fulfillment.qc_started": "Quality Check Started",
  "fulfillment.qc_passed": "Quality Check Passed",
  "fulfillment.qc_rework": "Returned for Rework",
  "fulfillment.qc_failed": "Quality Check Failed",
  "fulfillment.packed": "Packing Complete",
  "fulfillment.shipped": "Shipment Departed",
  "fulfillment.in_transit": "Shipment In Transit",
  "fulfillment.delivered": "Delivered",
  "fulfillment.completed": "Fulfillment Completed",
  "fulfillment.cancelled": "Fulfillment Cancelled",
  "fulfillment.failed": "Fulfillment Failed",
  "fulfillment.disputed": "Delivery Disputed",
  "fulfillment.milestone_completed": "Milestone Completed",
  "fulfillment.comment_added": "Comment Added",
}

export function formatFulfillmentStatus(
  status: FulfillmentOrderStatus
): string {
  return fulfillmentStatusLabels[status]
}

export function fulfillmentProgress(status: FulfillmentOrderStatus): number {
  if (status === "cancelled" || status === "failed") return 100
  const index = activeFulfillmentPath.indexOf(status)
  return index < 0
    ? 0
    : Math.round((index / (activeFulfillmentPath.length - 1)) * 100)
}

export function fulfillmentEventLabel(event: FulfillmentOrderEvent): string {
  if (event.event_type === "fulfillment.milestone_completed") {
    const milestone = event.metadata.milestone_type
    if (typeof milestone === "string") {
      return milestone
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }
  }
  return (
    eventLabels[event.event_type] ??
    event.event_type
      .replace(/^fulfillment\./, "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

export function fulfillmentEventTime(event: FulfillmentOrderEvent): string {
  const occurredAt = event.metadata.occurred_at
  return typeof occurredAt === "string" ? occurredAt : event.created_at
}

export function isMilestoneEvent(event: FulfillmentOrderEvent): boolean {
  return [
    "fulfillment.production_started",
    "fulfillment.packed",
    "fulfillment.shipped",
    "fulfillment.in_transit",
    "fulfillment.delivered",
    "fulfillment.milestone_completed",
  ].includes(event.event_type)
}
