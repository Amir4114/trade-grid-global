import type { Company } from "@/lib/database/types";

/** Fields that establish verified company identity — changing these after verification requires re-review. */
export const VERIFIED_SENSITIVE_COMPANY_FIELDS = [
  "company_name",
  "country",
] as const;

export type VerifiedSensitiveField =
  (typeof VERIFIED_SENSITIVE_COMPANY_FIELDS)[number];

export function isVerifiedCompany(company: Company): boolean {
  return company.verification_status === "verified";
}

/** Verified or actively under admin review — sensitive identity fields are locked. */
export function isIdentityLockedCompany(company: Company): boolean {
  return (
    company.verification_status === "verified" ||
    company.verification_status === "under_review"
  );
}

export function detectSensitiveCompanyChanges(
  current: Company,
  next: Partial<Pick<Company, VerifiedSensitiveField>>
): VerifiedSensitiveField[] {
  const changed: VerifiedSensitiveField[] = [];

  for (const field of VERIFIED_SENSITIVE_COMPANY_FIELDS) {
    if (!(field in next)) continue;

    const nextValue = next[field];
    if (nextValue === undefined) continue;

    const currentValue = current[field];
    if (String(currentValue ?? "").trim() !== String(nextValue ?? "").trim()) {
      changed.push(field);
    }
  }

  return changed;
}

export function requiresReverification(
  company: Company,
  next: Partial<Pick<Company, VerifiedSensitiveField>>
): boolean {
  return (
    isIdentityLockedCompany(company) &&
    detectSensitiveCompanyChanges(company, next).length > 0
  );
}

export function sensitiveFieldLabels(): Record<VerifiedSensitiveField, string> {
  return {
    company_name: "Company name",
    country: "Country of registration",
  };
}
