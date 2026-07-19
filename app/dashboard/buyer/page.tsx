"use client"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import DashboardShell from "@/components/dashboard/DashboardShell"
import DataTable from "@/components/dashboard/DataTable"
import { WorkspaceOverview } from "@/components/dashboard/WorkspaceOverview"
import { useCompany } from "@/contexts/AuthProvider"
import { inquiries, orders, rfqs } from "@/lib/marketplace/data"

export default function BuyerDashboardPage() {
  const { company } = useCompany()
  const openInquiries = inquiries.filter(
    (item) => item.status !== "Closed"
  ).length
  const activeOrders = orders.filter((item) => item.status !== "Draft").length
  const openRfqs = rfqs.filter((item) => item.status === "Open").length

  return (
    <DashboardShell
      role="buyer"
      title="Buyer Overview"
      description="Monitor sourcing activity, inquiries, and trade orders from one workspace."
    >
      <WorkspaceOverview role="buyer" company={company} />

      <div className="mt-6">
        <DashboardPanel
          title="Recent Inquiries"
          description={`${openRfqs} open RFQs · ${openInquiries} active inquiries · ${activeOrders} live orders`}
        >
          <DataTable
            columns={[
              { key: "fromCompany", label: "From" },
              { key: "subject", label: "Subject" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Date" },
            ]}
            rows={inquiries.slice(0, 6)}
          />
        </DashboardPanel>
      </div>

      <div className="mt-6">
        <DashboardPanel
          title="Recent Orders"
          description="Track confirmed and in-transit shipments."
        >
          <DataTable
            columns={[
              { key: "productName", label: "Product" },
              { key: "supplierCompany", label: "Supplier" },
              { key: "value", label: "Value" },
              { key: "status", label: "Status" },
              { key: "updatedAt", label: "Updated" },
            ]}
            rows={orders.slice(0, 5)}
          />
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
