import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { rfqs } from "@/lib/marketplace/data";

export default function AdminRfqsPage() {
  return (
    <DashboardShell
      role="admin"
      title="RFQs"
      description="Monitor buyer demand and RFQ health across categories."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "productName", label: "Product" },
            { key: "buyerCompany", label: "Buyer" },
            { key: "quantity", label: "Quantity" },
            { key: "category", label: "Category" },
            { key: "status", label: "Status" },
            { key: "deadline", label: "Deadline" },
          ]}
          rows={rfqs}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
