import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { quotes } from "@/lib/marketplace/data";

export default function SupplierQuotationsPage() {
  const rows = quotes.map((quote) => ({
    id: quote.id,
    rfqId: quote.rfqId,
    price: quote.price,
    leadTime: quote.leadTime,
    createdAt: quote.createdAt,
  }));

  return (
    <DashboardShell
      role="supplier"
      title="Quotations"
      description="Track submitted quotes and follow up on buyer decisions."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "id", label: "Quote ID" },
            { key: "rfqId", label: "RFQ" },
            { key: "price", label: "Price" },
            { key: "leadTime", label: "Lead Time" },
            { key: "createdAt", label: "Submitted" },
          ]}
          rows={rows}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
