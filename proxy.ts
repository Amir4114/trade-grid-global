import { type NextRequest } from "next/server";

import {
  fetchAuthRedirectContext,
  getCorrectOnboardingPath,
  getUserIdFromClaims,
  isOnboardingFormPath,
  isRoleDashboardPath,
  isWrongOnboardingPath,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";
import { getDashboardPathForRole, parseProfileRole } from "@/lib/dashboard/roles";
import {
  redirectWithSession,
  updateSession,
} from "@/lib/supabase/proxy";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/admin-login",
];

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_AUTH_PATHS.includes(pathname)) {
    return false;
  }

  return (
    pathname.startsWith("/dashboard") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/onboarding")
  );
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  supabaseResponse: Parameters<typeof redirectWithSession>[1]
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return redirectWithSession(redirectUrl, supabaseResponse);
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  const userId = getUserIdFromClaims(user);

  if (!userId) {
    return supabaseResponse;
  }

  const authContext = await fetchAuthRedirectContext(supabase, userId);
  const profileRole = parseProfileRole(authContext.role);

  if (!profileRole) {
    return supabaseResponse;
  }

  const destination = resolvePostAuthRedirectPath(authContext);

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/dashboard" ||
    pathname === "/onboarding"
  ) {
    return redirectTo(request, destination, supabaseResponse);
  }

  if (
    pathname.startsWith("/dashboard") &&
    !authContext.onboardingCompleted
  ) {
    return redirectTo(
      request,
      getCorrectOnboardingPath(profileRole),
      supabaseResponse
    );
  }

  if (isOnboardingFormPath(pathname) && authContext.onboardingCompleted) {
    return redirectTo(
      request,
      getDashboardPathForRole(profileRole),
      supabaseResponse
    );
  }

  if (
    pathname.startsWith("/dashboard") &&
    !isRoleDashboardPath(pathname, profileRole)
  ) {
    return redirectTo(
      request,
      getDashboardPathForRole(profileRole),
      supabaseResponse
    );
  }

  if (isWrongOnboardingPath(pathname, profileRole)) {
    return redirectTo(
      request,
      getCorrectOnboardingPath(profileRole),
      supabaseResponse
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/login",
    "/signup",
  ],
};
