import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { inquiries } from "@/lib/marketplace/data";

export default function BuyerInquiriesPage() {
  return (
    <DashboardShell
      role="buyer"
      title="Inquiries"
      description="Track supplier conversations and follow up on open trade discussions."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "fromCompany", label: "From" },
            { key: "toCompany", label: "To" },
            { key: "subject", label: "Subject" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Date" },
          ]}
          rows={inquiries}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
