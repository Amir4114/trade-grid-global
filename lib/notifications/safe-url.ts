import type { UserRole } from "@/lib/database/types"

const ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  buyer: ["/dashboard/buyer", "/onboarding/buyer", "/dashboard/notifications"],
  supplier: [
    "/dashboard/supplier",
    "/onboarding/supplier",
    "/dashboard/notifications",
  ],
  admin: ["/dashboard/admin", "/dashboard/notifications", "/admin"],
}

const EXTERNAL_PROTOCOL_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const CONTROL_OR_BACKSLASH_RE = /[\u0000-\u001f\u007f\\]/

function splitPathAndQuery(raw: string): { pathPart: string; query: string } {
  const hashIndex = raw.indexOf("#")
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const queryIndex = withoutHash.indexOf("?")

  if (queryIndex < 0) {
    return { pathPart: withoutHash, query: "" }
  }

  return {
    pathPart: withoutHash.slice(0, queryIndex),
    query: withoutHash.slice(queryIndex),
  }
}

/**
 * Canonicalize a local absolute path, rejecting traversal and suspicious forms.
 * Returns null when the input cannot be represented as a safe internal path.
 */
export function canonicalizeInternalPath(raw: string): string | null {
  const trimmed = raw.trim()

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null
  }

  if (EXTERNAL_PROTOCOL_RE.test(trimmed) || /javascript:/i.test(trimmed)) {
    return null
  }

  if (CONTROL_OR_BACKSLASH_RE.test(trimmed)) {
    return null
  }

  if (/%2e|%2f|%5c/i.test(trimmed)) {
    return null
  }

  let decoded = trimmed
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return null
  }

  if (CONTROL_OR_BACKSLASH_RE.test(decoded)) {
    return null
  }

  const { pathPart, query } = splitPathAndQuery(decoded)
  const segments = pathPart.split("/")
  const canonicalSegments: string[] = []

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue
    }

    if (segment === "..") {
      if (canonicalSegments.length === 0) {
        return null
      }
      canonicalSegments.pop()
      continue
    }

    if (segment.includes("\\") || segment.includes("\0")) {
      return null
    }

    canonicalSegments.push(segment)
  }

  const canonicalPath = `/${canonicalSegments.join("/")}`

  if (query && !query.startsWith("?")) {
    return null
  }

  return `${canonicalPath}${query}`
}

function isRoleAuthorizedPath(path: string, role: UserRole): boolean {
  const allowed = ALLOWED_PREFIXES[role]
  const { pathPart } = splitPathAndQuery(path)
  return allowed.some(
    (prefix) => pathPart === prefix || pathPart.startsWith(`${prefix}/`)
  )
}

/**
 * Reject external or role-inappropriate notification action URLs before navigation.
 * RLS still enforces data isolation; this prevents open-redirect UX issues.
 */
export function resolveSafeNotificationActionUrl(
  actionUrl: string | null | undefined,
  role: UserRole | null
): string | null {
  if (!actionUrl || !role) {
    return null
  }

  let canonical = canonicalizeInternalPath(actionUrl)
  if (!canonical) {
    return null
  }

  if (
    canonical === "/onboarding/verification" &&
    (role === "buyer" || role === "supplier")
  ) {
    canonical = `/onboarding/${role}?section=documents`
  }

  if (!isRoleAuthorizedPath(canonical, role)) {
    return null
  }

  return canonical
}
