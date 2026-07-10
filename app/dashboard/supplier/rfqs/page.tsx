import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { rfqs } from "@/lib/marketplace/data";

export default function SupplierRfqsPage() {
  return (
    <DashboardShell
      role="supplier"
      title="RFQs"
      description="Respond to buyer requests that match your export portfolio."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "productName", label: "Product" },
            { key: "buyerCompany", label: "Buyer" },
            { key: "quantity", label: "Quantity" },
            { key: "targetCountry", label: "Destination" },
            { key: "status", label: "Status" },
            { key: "deadline", label: "Deadline" },
          ]}
          rows={rfqs}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
