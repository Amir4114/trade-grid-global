import SupplierPurchaseOrderDetail from "@/components/purchase-orders/SupplierPurchaseOrderDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SupplierPurchaseOrderPage({ params }: Props) {
  const { id } = await params;
  return <SupplierPurchaseOrderDetail purchaseOrderId={id} />;
}
