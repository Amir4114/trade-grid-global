"use client"

import DashboardShell from "@/components/dashboard/DashboardShell"
import { WorkspaceNotificationPreview } from "@/components/dashboard/WorkspaceNotificationPreview"
import { WorkspaceOverview } from "@/components/dashboard/WorkspaceOverview"
import { WorkspaceRecentActivity } from "@/components/dashboard/WorkspaceRecentActivity"
import { useCompany } from "@/contexts/AuthProvider"

export default function SupplierDashboardPage() {
  const { company } = useCompany()

  return (
    <DashboardShell
      role="supplier"
      title="Supplier Overview"
      description="Manage products, respond to RFQs, and grow verified export relationships."
    >
      <WorkspaceOverview role="supplier" company={company} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <WorkspaceRecentActivity role="supplier" company={company} />
        <WorkspaceNotificationPreview />
      </div>
    </DashboardShell>
  )
}
