import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { quotes } from "@/lib/marketplace/data";

export default function BuyerQuotationsPage() {
  const rows = quotes.slice(0, 12).map((quote) => ({
    id: quote.id,
    rfqId: quote.rfqId,
    supplierId: quote.supplierId,
    price: quote.price,
    leadTime: quote.leadTime,
    createdAt: quote.createdAt,
  }));

  return (
    <DashboardShell
      role="buyer"
      title="Quotations"
      description="Compare supplier pricing, lead times, and commercial terms."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "id", label: "Quote ID" },
            { key: "rfqId", label: "RFQ" },
            { key: "supplierId", label: "Supplier" },
            { key: "price", label: "Price" },
            { key: "leadTime", label: "Lead Time" },
            { key: "createdAt", label: "Received" },
          ]}
          rows={rows}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
