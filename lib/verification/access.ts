import type { CompanyVerificationStatus } from "@/lib/database/types"

export function canPerformTrustSensitiveActions(
  status: CompanyVerificationStatus | null | undefined
): boolean {
  return status === "verified"
}

export function getVerificationProgress(
  status: CompanyVerificationStatus | null | undefined
): number {
  switch (status) {
    case "verified":
      return 100
    case "under_review":
      return 75
    case "rejected":
      return 50
    case "pending":
    default:
      return 25
  }
}

export function getVerificationGuidance(
  status: CompanyVerificationStatus | null | undefined
): string {
  switch (status) {
    case "verified":
      return "Your company trust profile is active."
    case "under_review":
      return "Review is in progress. Workspace and marketplace browsing remain available; trust-sensitive trading actions unlock after approval."
    case "rejected":
      return "Review the compliance feedback, replace rejected evidence, and resubmit."
    case "pending":
    default:
      return "Complete company evidence and submit verification to unlock trusted trading actions."
  }
}
