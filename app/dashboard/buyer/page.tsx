"use client"

import DashboardShell from "@/components/dashboard/DashboardShell"
import { WorkspaceNotificationPreview } from "@/components/dashboard/WorkspaceNotificationPreview"
import { WorkspaceOverview } from "@/components/dashboard/WorkspaceOverview"
import { WorkspaceRecentActivity } from "@/components/dashboard/WorkspaceRecentActivity"
import { useCompany } from "@/contexts/AuthProvider"

export default function BuyerDashboardPage() {
  const { company } = useCompany()

  return (
    <DashboardShell
      role="buyer"
      title="Buyer Overview"
      description="Monitor sourcing activity, inquiries, and trade orders from one workspace."
    >
      <WorkspaceOverview role="buyer" company={company} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <WorkspaceRecentActivity role="buyer" company={company} />
        <WorkspaceNotificationPreview />
      </div>
    </DashboardShell>
  )
}
