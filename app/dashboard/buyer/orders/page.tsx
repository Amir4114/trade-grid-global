import { FulfillmentWorkspace } from "@/components/fulfillment/FulfillmentWorkspace"
import BuyerPurchaseOrderList from "@/components/purchase-orders/BuyerPurchaseOrderList"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BuyerOrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const fulfillmentId = typeof params.id === "string" ? params.id : undefined
  const showFulfillment = params.tab === "fulfillment" || Boolean(fulfillmentId)

  return showFulfillment ? (
    <FulfillmentWorkspace role="buyer" fulfillmentId={fulfillmentId} />
  ) : (
    <BuyerPurchaseOrderList />
  )
}
