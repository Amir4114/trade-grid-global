import { BarChart3 } from "lucide-react"

import DashboardShell from "@/components/dashboard/DashboardShell"

export function WorkspaceAnalyticsPlaceholder({
  role,
}: {
  role: "buyer" | "supplier"
}) {
  return (
    <DashboardShell
      role={role}
      title="Analytics"
      description="A reserved workspace for governed trade performance insights."
    >
      <section className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          <BarChart3 className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">
          Analytics is coming later
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
          Navigation is reserved for future role-specific analytics. No metrics,
          pipelines, schemas, or inferred performance data are implemented in
          Phase 1.
        </p>
      </section>
    </DashboardShell>
  )
}
