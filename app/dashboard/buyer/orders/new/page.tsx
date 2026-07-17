import { Suspense } from "react";

import BuyerCreatePurchaseOrder from "@/components/purchase-orders/BuyerCreatePurchaseOrder";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function BuyerCreatePurchaseOrderPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell role="buyer" title="Create purchase order" description="Loading...">
          <DashboardPanel>
            <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
          </DashboardPanel>
        </DashboardShell>
      }
    >
      <BuyerCreatePurchaseOrder />
    </Suspense>
  );
}
