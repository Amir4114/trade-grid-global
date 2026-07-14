import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getDashboardPathForRole,
  getOnboardingPathForRole,
  parseProfileRole,
} from "@/lib/dashboard/roles";
import type { Database } from "@/lib/database/types";
import type { UserRole } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

export type AuthRedirectContext = {
  role: string | null;
  onboardingCompleted: boolean;
};

export function getUserIdFromClaims(
  claims: Record<string, unknown> | null
): string | null {
  if (!claims) return null;

  return typeof claims.sub === "string" ? claims.sub : null;
}

export async function fetchAuthRedirectContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AuthRedirectContext> {
  const [profileResult, companyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("Failed loading profile:", profileResult.error);
  }

  if (companyResult.error) {
    console.error("Failed loading company:", companyResult.error);
  }

  return {
    role: profileResult.data?.role ?? null,
    onboardingCompleted:
      companyResult.data?.onboarding_completed ?? false,
  };
}

export async function fetchClientAuthRedirectContext(
  userId: string
): Promise<AuthRedirectContext> {
  const supabase = createClient();

  return fetchAuthRedirectContext(supabase, userId);
}

function isSafeNextPath(
  nextPath: string,
  role: UserRole
): boolean {
  if (!nextPath.startsWith("/")) return false;

  if (nextPath.startsWith("//")) return false;

  switch (role) {
    case "buyer":
      return (
        nextPath.startsWith("/dashboard/buyer") ||
        nextPath.startsWith("/onboarding/buyer")
      );

    case "supplier":
      return (
        nextPath.startsWith("/dashboard/supplier") ||
        nextPath.startsWith("/onboarding/supplier")
      );

    case "admin":
      return (
        nextPath.startsWith("/dashboard/admin") ||
        nextPath === "/admin" ||
        nextPath.startsWith("/admin/")
      );

    default:
      return false;
  }
}

export function resolvePostAuthRedirectPath(
  context: AuthRedirectContext & { nextPath?: string | null }
): string {
  const { role, nextPath } = context;
  const parsedRole = parseProfileRole(role);

  if (!parsedRole) {
    console.warn("Unknown role received:", role);
    return "/login";
  }

  if (nextPath && isSafeNextPath(nextPath, parsedRole)) {
    return nextPath;
  }

  return getDashboardPathForRole(parsedRole);
}

/**
 * Resolves the neutral /onboarding entry route.
 * Incomplete users go to their role onboarding form; completed users go to dashboard.
 */
export function resolveOnboardingEntryPath({
  role,
  onboardingCompleted,
}: AuthRedirectContext): string {
  const parsedRole = parseProfileRole(role);

  if (!parsedRole) {
    return "/login";
  }

  if (parsedRole === "admin") {
    return getDashboardPathForRole(parsedRole);
  }

  if (onboardingCompleted) {
    return getDashboardPathForRole(parsedRole);
  }

  return getOnboardingPathForRole(parsedRole);
}

/**
 * Single source of truth for future feature gates that require completed onboarding.
 * Dashboard access itself is NOT gated by this helper.
 */
export function isOnboardingComplete(
  company: { onboarding_completed?: boolean | null } | null | undefined
): boolean {
  return company?.onboarding_completed === true;
}

export function requiresCompletedOnboarding(
  company: { onboarding_completed?: boolean | null } | null | undefined
): boolean {
  return !isOnboardingComplete(company);
}

export function isSharedDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard/notifications";
}

export function isRoleDashboardPath(
  pathname: string,
  role: UserRole
): boolean {
  if (isSharedDashboardPath(pathname)) {
    return true;
  }

  switch (role) {
    case "buyer":
      return pathname.startsWith("/dashboard/buyer");

    case "supplier":
      return pathname.startsWith("/dashboard/supplier");

    case "admin":
      return (
        pathname.startsWith("/dashboard/admin") ||
        pathname === "/admin" ||
        pathname.startsWith("/admin/")
      );

    default:
      return false;
  }
}

export function isOnboardingFormPath(
  pathname: string
): boolean {
  return (
    pathname === "/onboarding/buyer" ||
    pathname === "/onboarding/supplier"
  );
}

export function isWrongOnboardingPath(
  pathname: string,
  role: UserRole
): boolean {
  return (
    (pathname === "/onboarding/buyer" &&
      role === "supplier") ||
    (pathname === "/onboarding/supplier" &&
      role === "buyer")
  );
}

export function getCorrectOnboardingPath(
  role: UserRole
): string {
  return getOnboardingPathForRole(role);
}