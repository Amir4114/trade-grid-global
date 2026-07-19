const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function slugifyCompanyName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "company"
  )
}

export function publicCompanyPath(
  companyName: string,
  companyId: string
): string {
  if (!UUID_PATTERN.test(companyId)) {
    return `/suppliers/${encodeURIComponent(companyId)}`
  }
  return `/company/${slugifyCompanyName(companyName)}--${companyId}`
}

export function parsePublicCompanySlug(slug: string): string | null {
  const separator = slug.lastIndexOf("--")
  if (separator < 1) return null
  const companyId = slug.slice(separator + 2)
  return UUID_PATTERN.test(companyId) ? companyId : null
}
