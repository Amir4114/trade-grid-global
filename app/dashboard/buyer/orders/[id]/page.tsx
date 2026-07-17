import BuyerPurchaseOrderDetail from "@/components/purchase-orders/BuyerPurchaseOrderDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BuyerPurchaseOrderPage({ params }: Props) {
  const { id } = await params;
  return <BuyerPurchaseOrderDetail purchaseOrderId={id} />;
}
