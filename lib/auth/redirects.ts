import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getDashboardPathForRole,
  getOnboardingPathForRole,
  parseProfileRole,
} from "@/lib/dashboard/roles"
import type { Database } from "@/lib/database/types"
import type { CompanyVerificationStatus, UserRole } from "@/lib/database/types"
import { createClient } from "@/lib/supabase/client"

export type AuthRedirectContext = {
  role: string | null
  onboardingCompleted: boolean
  companyExists?: boolean
  verificationStatus?: CompanyVerificationStatus | null
}

export function getUserIdFromClaims(
  claims: Record<string, unknown> | null
): string | null {
  if (!claims) return null

  return typeof claims.sub === "string" ? claims.sub : null
}

export async function fetchAuthRedirectContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AuthRedirectContext> {
  const [profileResult, companyResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),

    supabase
      .from("companies")
      .select("onboarding_completed,verification_status")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (profileResult.error) {
    console.error("Failed loading profile:", profileResult.error)
  }

  if (companyResult.error) {
    console.error("Failed loading company:", companyResult.error)
  }

  return {
    role: profileResult.data?.role ?? null,
    companyExists: companyResult.data !== null,
    onboardingCompleted: companyResult.data?.onboarding_completed ?? false,
    verificationStatus: companyResult.data?.verification_status ?? null,
  }
}

export async function fetchClientAuthRedirectContext(
  userId: string
): Promise<AuthRedirectContext> {
  const supabase = createClient()

  return fetchAuthRedirectContext(supabase, userId)
}

function isPathWithin(path: string, basePath: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function isSafeNextPath(nextPath: string, role: UserRole): boolean {
  if (!nextPath.startsWith("/")) return false

  if (nextPath.startsWith("//")) return false

  switch (role) {
    case "buyer":
      return (
        isPathWithin(nextPath, "/dashboard/buyer") ||
        isPathWithin(nextPath, "/onboarding/buyer")
      )

    case "supplier":
      return (
        isPathWithin(nextPath, "/dashboard/supplier") ||
        isPathWithin(nextPath, "/onboarding/supplier")
      )

    case "admin":
      return (
        isPathWithin(nextPath, "/dashboard/admin") ||
        isPathWithin(nextPath, "/admin")
      )

    default:
      return false
  }
}

export function resolvePostAuthRedirectPath(
  context: AuthRedirectContext & { nextPath?: string | null }
): string {
  const { role, nextPath } = context
  const parsedRole = parseProfileRole(role)

  if (context.companyExists === false && parsedRole !== "admin") {
    return "/signup?recovery=1"
  }

  if (!parsedRole) {
    console.warn("Unknown role received:", role)
    return "/login"
  }

  if (nextPath && isSafeNextPath(nextPath, parsedRole)) {
    return nextPath
  }

  return getDashboardPathForRole(parsedRole)
}

/**
 * Resolves the neutral /onboarding entry route.
 * Incomplete users go to their role onboarding form; completed users go to dashboard.
 */
export function resolveOnboardingEntryPath({
  role,
  onboardingCompleted,
}: AuthRedirectContext): string {
  const parsedRole = parseProfileRole(role)

  if (!parsedRole) {
    return "/login"
  }

  if (parsedRole === "admin") {
    return getDashboardPathForRole(parsedRole)
  }

  if (onboardingCompleted) {
    return getDashboardPathForRole(parsedRole)
  }

  return getOnboardingPathForRole(parsedRole)
}

/**
 * Single source of truth for future feature gates that require completed onboarding.
 * Dashboard access itself is NOT gated by this helper.
 */
export function isOnboardingComplete(
  company: { onboarding_completed?: boolean | null } | null | undefined
): boolean {
  return company?.onboarding_completed === true
}

export function requiresCompletedOnboarding(
  company: { onboarding_completed?: boolean | null } | null | undefined
): boolean {
  return !isOnboardingComplete(company)
}

export function shouldRedirectOnboardingWorkspaceToDashboard(
  context: AuthRedirectContext
): boolean {
  return (
    context.onboardingCompleted &&
    (context.verificationStatus === "under_review" ||
      context.verificationStatus === "verified")
  )
}

export function isSharedDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard/notifications"
}

export function isRoleDashboardPath(pathname: string, role: UserRole): boolean {
  if (isSharedDashboardPath(pathname)) {
    return true
  }

  switch (role) {
    case "buyer":
      return isPathWithin(pathname, "/dashboard/buyer")

    case "supplier":
      return isPathWithin(pathname, "/dashboard/supplier")

    case "admin":
      return (
        isPathWithin(pathname, "/dashboard/admin") ||
        isPathWithin(pathname, "/admin")
      )

    default:
      return false
  }
}

export function isOnboardingFormPath(pathname: string): boolean {
  return pathname === "/onboarding/buyer" || pathname === "/onboarding/supplier"
}

export function isWrongOnboardingPath(
  pathname: string,
  role: UserRole
): boolean {
  return (
    (pathname === "/onboarding/buyer" && role === "supplier") ||
    (pathname === "/onboarding/supplier" && role === "buyer")
  )
}

export function getCorrectOnboardingPath(role: UserRole): string {
  return getOnboardingPathForRole(role)
}
