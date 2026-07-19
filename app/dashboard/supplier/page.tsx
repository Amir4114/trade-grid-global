"use client"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import DashboardShell from "@/components/dashboard/DashboardShell"
import DataTable from "@/components/dashboard/DataTable"
import { WorkspaceOverview } from "@/components/dashboard/WorkspaceOverview"
import { useCompany } from "@/contexts/AuthProvider"
import { quotes, rfqs } from "@/lib/marketplace/data"

export default function SupplierDashboardPage() {
  const { company } = useCompany()
  const openRfqs = rfqs.filter((item) => item.status === "Open").length

  return (
    <DashboardShell
      role="supplier"
      title="Supplier Overview"
      description="Manage products, respond to RFQs, and grow verified export relationships."
    >
      <WorkspaceOverview role="supplier" company={company} />

      <div className="mt-6">
        <DashboardPanel
          title="Matching RFQs"
          description={`${openRfqs} open RFQs · ${quotes.length} quotations in the current workspace`}
        >
          <DataTable
            columns={[
              { key: "productName", label: "Product" },
              { key: "buyerCompany", label: "Buyer" },
              { key: "quantity", label: "Quantity" },
              { key: "status", label: "Status" },
              { key: "deadline", label: "Deadline" },
            ]}
            rows={rfqs.slice(0, 6)}
          />
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
