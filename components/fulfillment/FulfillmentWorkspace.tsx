import { FulfillmentDetailView } from "@/components/fulfillment/FulfillmentDetailView"
import { FulfillmentList } from "@/components/fulfillment/FulfillmentList"

export function FulfillmentWorkspace({
  role,
  fulfillmentId,
}: {
  role: "buyer" | "supplier"
  fulfillmentId?: string
}) {
  return fulfillmentId ? (
    <FulfillmentDetailView role={role} fulfillmentId={fulfillmentId} />
  ) : (
    <FulfillmentList role={role} />
  )
}
