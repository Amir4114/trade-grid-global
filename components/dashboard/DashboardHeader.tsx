"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Company, Profile, UserRole } from "@/lib/database/types"
import {
  loadWorkspaceSummary,
  type WorkspaceSummaryItem,
} from "@/lib/dashboard/summary"
import { formatVerificationStatus, roleLabel } from "@/lib/dashboard/roles"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type DashboardHeaderProps = {
  role: UserRole
  profile: Profile
  company: Company | null
  title: string
  description?: string
  badge?: string
  actions?: React.ReactNode
}

const statusTone = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  under_review: "border-amber-300 bg-amber-100 text-amber-900",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
} as const

export default function DashboardHeader({
  role,
  profile,
  company,
  title,
  description,
  badge,
  actions,
}: DashboardHeaderProps) {
  const supabase = useMemo(() => createClient(), [])
  const [summary, setSummary] = useState<WorkspaceSummaryItem[] | null>(null)
  const [summaryError, setSummaryError] = useState(false)

  useEffect(() => {
    let active = true
    void loadWorkspaceSummary(supabase, role, company)
      .then((items) => {
        if (active) setSummary(items)
      })
      .catch(() => {
        if (active) setSummaryError(true)
      })
    return () => {
      active = false
    }
  }, [company, role, supabase])

  const firstName = profile.full_name?.trim().split(/\s+/)[0] || roleLabel(role)
  const workspaceLabel = `${roleLabel(role)} Workspace`
  const companyName =
    role === "admin"
      ? "Trade Grid Global"
      : company?.company_name || "Company setup pending"
  const verification = company?.verification_status ?? "pending"

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-neutral-200 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500">
            Welcome back, {firstName} <span aria-hidden="true">👋</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              {workspaceLabel}
            </h1>
            {badge ? (
              <Badge
                variant="outline"
                className="border-neutral-300 bg-neutral-50"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-neutral-800">{title}</p>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="grid gap-px bg-neutral-200 sm:grid-cols-2">
        <div className="flex items-center gap-3 bg-neutral-50 px-5 py-4 sm:px-6">
          <Building2
            className="size-5 shrink-0 text-neutral-500"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Company
            </p>
            <p className="truncate text-sm font-semibold text-neutral-950">
              {companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-neutral-50 px-5 py-4 sm:px-6">
          <ShieldCheck
            className="size-5 shrink-0 text-neutral-500"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Verification
            </p>
            {role === "admin" ? (
              <p className="text-sm font-semibold text-neutral-950">
                Operations access
              </p>
            ) : (
              <Badge
                variant="outline"
                className={cn("mt-1", statusTone[verification])}
              >
                {formatVerificationStatus(verification)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <section className="p-5 sm:p-6" aria-labelledby="workspace-summary-title">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="workspace-summary-title"
            className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase"
          >
            Today&apos;s Summary
          </h2>
          {summaryError ? (
            <span className="text-xs text-neutral-500">
              Summary unavailable
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary
            ? summary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3"
                >
                  <p className="text-2xl font-semibold text-neutral-950 tabular-nums">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500">
                    {item.label}
                  </p>
                </div>
              ))
            : Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-[70px] animate-pulse rounded-xl bg-neutral-100"
                  aria-hidden="true"
                />
              ))}
        </div>
      </section>
    </header>
  )
}
