import Link from "next/link";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/marketplace/data";

export default function SupplierProductsPage() {
  const rows = products.slice(0, 15).map((product) => ({
    name: product.name,
    category: product.category,
    country: product.country,
    moq: product.moq,
    leadTime: product.leadTime,
  }));

  return (
    <DashboardShell
      role="supplier"
      title="Products"
      description="Manage export listings, MOQs, and product specifications."
      actions={
        <Button asChild size="sm">
          <Link href="/products">View marketplace</Link>
        </Button>
      }
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "country", label: "Origin" },
            { key: "moq", label: "MOQ" },
            { key: "leadTime", label: "Lead Time" },
          ]}
          rows={rows}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
