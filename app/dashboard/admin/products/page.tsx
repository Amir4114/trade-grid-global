import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import { products } from "@/lib/marketplace/data";

export default function AdminProductsPage() {
  const rows = products.slice(0, 20).map((product) => ({
    name: product.name,
    category: product.category,
    country: product.country,
    moq: product.moq,
    supplierId: product.supplierId,
  }));

  return (
    <DashboardShell
      role="admin"
      title="Products"
      description="Moderate marketplace listings and category coverage."
    >
      <DashboardPanel>
        <DataTable
          columns={[
            { key: "name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "country", label: "Origin" },
            { key: "moq", label: "MOQ" },
            { key: "supplierId", label: "Supplier ID" },
          ]}
          rows={rows}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
