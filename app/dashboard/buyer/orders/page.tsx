import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { orders } from "@/lib/marketplace/data";

export default function BuyerOrdersPage() {
  return (
    <DashboardShell
      role="buyer"
      title="Orders"
      description="Monitor confirmed shipments and negotiations in progress."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "productName", label: "Product" },
            { key: "supplierCompany", label: "Supplier" },
            { key: "value", label: "Value" },
            { key: "status", label: "Status" },
            { key: "updatedAt", label: "Updated" },
          ]}
          rows={orders}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
