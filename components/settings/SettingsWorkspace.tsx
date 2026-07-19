"use client"

import Link from "next/link"
import { useState } from "react"

import AccountSettingsSection from "@/components/settings/AccountSettingsSection"
import BuyerCompanyProfileSection from "@/components/settings/BuyerCompanyProfileSection"
import NotificationPreferencesSection from "@/components/settings/NotificationPreferencesSection"
import SupplierCompanyProfileSection from "@/components/settings/SupplierCompanyProfileSection"
import VerificationSecuritySection from "@/components/settings/VerificationSecuritySection"
import DashboardShell from "@/components/dashboard/DashboardShell"
import DashboardPanel from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider"

type SettingsWorkspaceProps = {
  role: "buyer" | "supplier"
  title: string
  description: string
}

export default function SettingsWorkspace({
  role,
  title,
  description,
}: SettingsWorkspaceProps) {
  const { user, error: authError } = useAuth()
  const { profile, error: profileError, refreshProfile } = useProfile()
  const { company, refreshCompany, loading, error: companyError } = useCompany()
  const [retrying, setRetrying] = useState(false)

  if (loading) {
    return (
      <DashboardShell role={role} title={title} description={description}>
        <DashboardPanel>
          <p className="text-sm text-neutral-500">Loading settings...</p>
        </DashboardPanel>
      </DashboardShell>
    )
  }

  const loadError = authError ?? profileError ?? companyError

  if (loadError) {
    const retry = async () => {
      try {
        setRetrying(true)
        await Promise.all([refreshProfile(), refreshCompany()])
      } catch {
        // The provider retains the actionable fetch error for this state.
      } finally {
        setRetrying(false)
      }
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 text-neutral-950">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Unable to load settings</h1>
          <p className="mt-2 text-sm text-neutral-600">{loadError}</p>
          <Button
            className="mt-5"
            disabled={retrying}
            onClick={() => void retry()}
          >
            {retrying ? "Retrying..." : "Try again"}
          </Button>
        </div>
      </main>
    )
  }

  if (!user || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 text-neutral-950">
        <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Account data unavailable</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sign in again to reload your account and settings.
          </p>
          <Button asChild className="mt-5">
            <Link href={`/login?next=/dashboard/${role}/settings`}>
              Go to sign in
            </Link>
          </Button>
        </div>
      </main>
    )
  }

  if (!company) {
    return (
      <DashboardShell role={role} title={title} description={description}>
        <DashboardPanel title="Complete your organization profile">
          <p className="max-w-xl text-sm text-neutral-600">
            Your account does not have an organization profile yet. Complete
            onboarding before managing company, verification, and notification
            settings.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/onboarding/${role}`}>Complete onboarding</Link>
          </Button>
        </DashboardPanel>
      </DashboardShell>
    )
  }

  const handleCompanySaved = async () => {
    await refreshCompany()
  }

  const handleAccountSaved = async () => {
    await Promise.all([refreshProfile(), refreshCompany()])
  }

  return (
    <DashboardShell role={role} title={title} description={description}>
      <div className="space-y-6">
        <AccountSettingsSection
          user={user}
          profile={profile}
          onSaved={handleAccountSaved}
        />

        {role === "supplier" ? (
          <SupplierCompanyProfileSection
            key={company.updated_at}
            user={user}
            company={company}
            onSaved={handleCompanySaved}
          />
        ) : (
          <BuyerCompanyProfileSection
            key={company.updated_at}
            user={user}
            company={company}
            onSaved={handleCompanySaved}
          />
        )}

        <VerificationSecuritySection company={company} />
        <NotificationPreferencesSection />
      </div>
    </DashboardShell>
  )
}
