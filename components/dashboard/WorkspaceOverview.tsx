"use client"

import Link from "next/link"
import {
  ArrowRight,
  FilePlus2,
  PackageSearch,
  Search,
  ShieldCheck,
} from "lucide-react"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import StatCard from "@/components/dashboard/StatCard"
import { VerificationStatusCard } from "@/components/dashboard/VerificationStatusCard"
import { Button } from "@/components/ui/button"
import type { Company } from "@/lib/database/types"

type WorkspaceRole = "buyer" | "supplier"

const quickActions = {
  buyer: [
    {
      label: "Create RFQ draft",
      href: "/dashboard/buyer/rfqs/new",
      icon: FilePlus2,
    },
    { label: "Find suppliers", href: "/suppliers", icon: Search },
    {
      label: "Manage verification",
      href: "/onboarding/buyer?section=documents",
      icon: ShieldCheck,
    },
  ],
  supplier: [
    {
      label: "Create product draft",
      href: "/dashboard/supplier/products/new",
      icon: FilePlus2,
    },
    {
      label: "Browse RFQs",
      href: "/dashboard/supplier/rfqs",
      icon: PackageSearch,
    },
    {
      label: "Manage verification",
      href: "/onboarding/supplier?section=documents",
      icon: ShieldCheck,
    },
  ],
} as const

export function WorkspaceOverview({
  role,
  company,
}: {
  role: WorkspaceRole
  company: Company | null
}) {
  const marketCount =
    role === "buyer"
      ? (company?.target_markets.length ?? 0)
      : (company?.export_markets.length ?? 0)
  const healthChecks = [
    Boolean(company?.company_name),
    Boolean(company?.country),
    Boolean(company?.business_type),
    Boolean(company?.company_structure),
    (company?.categories.length ?? 0) > 0,
    marketCount > 0,
  ]
  const companyHealth = Math.round(
    (healthChecks.filter(Boolean).length / healthChecks.length) * 100
  )
  const pendingTasks = [
    !company?.onboarding_completed ? "Complete company onboarding" : null,
    company?.verification_status === "pending"
      ? "Submit verification evidence"
      : null,
    company?.verification_status === "rejected"
      ? "Review verification feedback"
      : null,
  ].filter((task): task is string => Boolean(task))
  const actions = quickActions[role].map((action, index) =>
    index === 2 &&
    (company?.verification_status === "under_review" ||
      company?.verification_status === "verified")
      ? {
          label: "Browse marketplace",
          href: "/marketplace",
          icon: Search,
        }
      : action
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Company health"
          value={`${companyHealth}%`}
          detail={
            companyHealth === 100
              ? "Core company profile is complete"
              : "Complete profile details to improve marketplace trust"
          }
          accent
        />
        <StatCard
          label="Product categories"
          value={String(company?.categories.length ?? 0)}
          detail={
            role === "buyer" ? "Sourcing categories" : "Supply categories"
          }
        />
        <StatCard
          label={role === "buyer" ? "Sourcing markets" : "Export markets"}
          value={String(marketCount)}
          detail="Configured trade markets"
        />
        <VerificationStatusCard
          role={role}
          status={company?.verification_status ?? "pending"}
        />
      </div>

      <DashboardPanel
        title="Quick Actions"
        description="Continue the highest-value workspace tasks."
      >
        <div className="space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon

            return (
              <Button
                key={action.href}
                asChild
                variant={index === 0 ? "default" : "outline"}
                className="w-full justify-between"
              >
                <Link href={action.href}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {action.label}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )
          })}
        </div>
        <div className="mt-5 border-t border-neutral-200 pt-5">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Pending Tasks
          </p>
          {pendingTasks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              {pendingTasks.map((task) => (
                <li key={task} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {task}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              No company setup tasks require attention.
            </p>
          )}
        </div>
      </DashboardPanel>
    </div>
  )
}
