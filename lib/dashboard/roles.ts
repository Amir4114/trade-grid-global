import type { UserRole as MarketplaceUserRole } from "@/lib/marketplace/types";
import type { UserRole as DatabaseUserRole } from "@/lib/database/types";

export type { UserRole } from "@/lib/database/types";

const LEGACY_ROLE_ALIASES: Record<string, DatabaseUserRole> = {
  importer: "buyer",
  exporter: "supplier",
};

const CANONICAL_ROLES = new Set<DatabaseUserRole>(["buyer", "supplier", "admin"]);

export function parseProfileRole(
  role: string | undefined | null
): DatabaseUserRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.toLowerCase();

  if (CANONICAL_ROLES.has(normalized as DatabaseUserRole)) {
    return normalized as DatabaseUserRole;
  }

  return LEGACY_ROLE_ALIASES[normalized] ?? null;
}

export function getDashboardPathForRole(
  role: string | undefined | null
): string {
  const profileRole = parseProfileRole(role);

  if (profileRole === "buyer") {
    return "/dashboard/buyer";
  }

  if (profileRole === "supplier") {
    return "/dashboard/supplier";
  }

  if (profileRole === "admin") {
    return "/dashboard/admin";
  }

  return "/login";
}

export function getOnboardingPathForRole(
  role: string | undefined | null
): string {
  const profileRole = parseProfileRole(role);

  if (profileRole === "supplier") {
    return "/onboarding/supplier";
  }

  if (profileRole === "buyer") {
    return "/onboarding/buyer";
  }

  return "/login";
}

export function roleLabel(role: MarketplaceUserRole): string {
  const labels: Record<MarketplaceUserRole, string> = {
    buyer: "Buyer",
    supplier: "Supplier",
    admin: "Admin",
  };

  return labels[role];
}

export function formatVerificationStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
