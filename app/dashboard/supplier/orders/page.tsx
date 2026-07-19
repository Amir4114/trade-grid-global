import { FulfillmentWorkspace } from "@/components/fulfillment/FulfillmentWorkspace"
import SupplierPurchaseOrderList from "@/components/purchase-orders/SupplierPurchaseOrderList"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SupplierOrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const fulfillmentId = typeof params.id === "string" ? params.id : undefined
  const showFulfillment = params.tab === "fulfillment" || Boolean(fulfillmentId)

  return showFulfillment ? (
    <FulfillmentWorkspace role="supplier" fulfillmentId={fulfillmentId} />
  ) : (
    <SupplierPurchaseOrderList />
  )
}
