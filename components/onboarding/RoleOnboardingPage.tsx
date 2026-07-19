"use client"

import { useState } from "react"
import Link from "next/link"

import { OnboardingWorkspace } from "@/components/onboarding/OnboardingWorkspace"
import { Button } from "@/components/ui/button"
import { useAuth, useCompany, useProfile } from "@/contexts/AuthProvider"
import type { UserRole } from "@/lib/database/types"

type MarketplaceRole = Extract<UserRole, "buyer" | "supplier">

export function RoleOnboardingPage({ role }: { role: MarketplaceRole }) {
  const { user, loading: authLoading, error: authError } = useAuth()
  const { profile, error: profileError, refreshProfile } = useProfile()
  const {
    company,
    loading: companyLoading,
    error: companyError,
    refreshCompany,
  } = useCompany()
  const [retrying, setRetrying] = useState(false)

  if (authLoading || companyLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-950">
        <p className="text-sm text-neutral-500">
          Loading onboarding workspace...
        </p>
      </main>
    )
  }

  const loadError = authError ?? profileError ?? companyError
  if (loadError) {
    const retry = async () => {
      try {
        setRetrying(true)
        await Promise.all([refreshProfile(), refreshCompany()])
      } catch {
        // Providers retain the actionable fetch error rendered by this state.
      } finally {
        setRetrying(false)
      }
    }

    return (
      <StateCard
        title="Unable to load onboarding"
        description={loadError}
        tone="error"
      >
        <Button disabled={retrying} onClick={() => void retry()}>
          {retrying ? "Retrying..." : "Try again"}
        </Button>
      </StateCard>
    )
  }

  if (!user) {
    return (
      <StateCard
        title="Sign in to continue"
        description="Your session is no longer available."
      >
        <Button asChild>
          <Link href={`/login?next=/onboarding/${role}`}>Go to sign in</Link>
        </Button>
      </StateCard>
    )
  }

  if (profile?.role && profile.role !== role) {
    return (
      <StateCard
        title="Onboarding workspace mismatch"
        description={`This account is registered as a ${profile.role}. Continue in the correct workspace.`}
        tone="error"
      >
        <Button asChild>
          <Link href={`/onboarding/${profile.role}`}>
            Open {profile.role} onboarding
          </Link>
        </Button>
      </StateCard>
    )
  }

  if (role === "supplier" && !company) {
    return (
      <StateCard
        title="Supplier organization profile unavailable"
        description="The organization record created during signup is missing. Retry the account load or use account recovery before uploading compliance evidence."
        tone="warning"
      >
        <Button
          disabled={retrying}
          onClick={() => {
            void (async () => {
              try {
                setRetrying(true)
                await refreshCompany()
              } catch {
                // The company provider retains the actionable fetch error.
              } finally {
                setRetrying(false)
              }
            })()
          }}
        >
          {retrying ? "Retrying..." : "Try again"}
        </Button>
      </StateCard>
    )
  }

  return (
    <OnboardingWorkspace
      role={role}
      user={user}
      profile={profile}
      company={company}
      refreshCompany={refreshCompany}
      refreshProfile={refreshProfile}
    />
  )
}

function StateCard({
  title,
  description,
  tone = "neutral",
  children,
}: {
  title: string
  description: string
  tone?: "neutral" | "warning" | "error"
  children: React.ReactNode
}) {
  const border =
    tone === "error"
      ? "border-red-200"
      : tone === "warning"
        ? "border-amber-200"
        : "border-neutral-200"

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <div
        className={`w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm ${border}`}
      >
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </main>
  )
}
