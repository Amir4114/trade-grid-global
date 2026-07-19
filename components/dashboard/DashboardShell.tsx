"use client"

import { useState } from "react"

import DashboardHeader from "@/components/dashboard/DashboardHeader"
import DashboardSidebar from "@/components/dashboard/DashboardSidebar"
import DashboardTopBar from "@/components/dashboard/DashboardTopBar"
import OnboardingNotice from "@/components/dashboard/OnboardingNotice"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider"
import { getDashboardNavigation } from "@/lib/dashboard/navigation"
import { parseProfileRole } from "@/lib/dashboard/roles"
import type { UserRole } from "@/lib/marketplace/types"

type DashboardShellProps = {
  role?: UserRole
  title: string
  description?: string
  badge?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function DashboardShell({
  role: expectedRole,
  title,
  description,
  badge,
  actions,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, loading: authLoading, error: authError } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const { company, loading: companyLoading } = useCompany()

  const loading = authLoading || profileLoading || companyLoading
  const resolvedRole = parseProfileRole(profile?.role)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-950">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
          <p className="mt-4 text-sm text-neutral-500">Loading workspace...</p>
        </div>
      </main>
    )
  }

  if (authError || !user || !profile || !resolvedRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 text-neutral-950">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {authError ?? "Unable to load your account. Please sign in again."}
        </p>
      </main>
    )
  }

  if (expectedRole && expectedRole !== resolvedRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 text-neutral-950">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You do not have access to this workspace section.
        </p>
      </main>
    )
  }

  const navItems = getDashboardNavigation(resolvedRole)
  const displayDescription =
    description ??
    (company?.company_name
      ? `${company.company_name} · ${company.country || "Global trade"}`
      : undefined)

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <DashboardTopBar
        role={resolvedRole}
        email={profile.email ?? user.email}
        onMenuClick={() => setMobileOpen(true)}
      />

      <div className="mx-auto flex max-w-[1600px]">
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
            <DashboardSidebar role={resolvedRole} items={navItems} />
          </div>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton
            className="w-[280px] border-neutral-800 bg-neutral-950 p-0 text-white sm:max-w-[280px]"
          >
            <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
            <DashboardSidebar
              role={resolvedRole}
              items={navItems}
              onNavigate={() => setMobileOpen(false)}
              className="h-full"
            />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <DashboardHeader
            role={resolvedRole}
            profile={profile}
            company={company}
            title={title}
            description={displayDescription}
            badge={badge}
            actions={actions}
          />
          <OnboardingNotice role={resolvedRole} company={company} />
          {children}
        </main>
      </div>
    </div>
  )
}
