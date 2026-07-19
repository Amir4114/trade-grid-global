"use client"

import Link from "next/link"

import SettingsSection from "@/components/settings/SettingsSection"
import { Button } from "@/components/ui/button"
import type { Company } from "@/lib/database/types"
import { formatVerificationStatus } from "@/lib/dashboard/roles"

type VerificationSecuritySectionProps = {
  company: Company
}

export default function VerificationSecuritySection({
  company,
}: VerificationSecuritySectionProps) {
  const status = company.verification_status
  const needsAction = status === "pending" || status === "rejected"
  const onboardingRole =
    company.account_type === "supplier" ? "supplier" : "buyer"
  const documentsHref = `/onboarding/${onboardingRole}?section=documents`

  return (
    <SettingsSection
      title="Verification & security"
      description="Company verification status and document submission."
    >
      <div className="max-w-xl space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-sm text-neutral-500">Verification status</p>
          <p className="mt-1 text-base font-semibold text-neutral-950">
            {formatVerificationStatus(status)}
          </p>
          {status === "verified" ? (
            <p className="mt-2 text-sm text-neutral-600">
              Your company is verified. Changes to legal name or country of
              registration will require re-verification.
            </p>
          ) : null}
          {status === "under_review" ? (
            <p className="mt-2 text-sm text-neutral-600">
              Your submission is being reviewed by the Trade Grid Global team.
            </p>
          ) : null}
          {status === "rejected" ? (
            <p className="mt-2 text-sm text-neutral-600">
              Verification was not approved. Update your documents and resubmit.
            </p>
          ) : null}
          {status === "pending" ? (
            <p className="mt-2 text-sm text-neutral-600">
              Complete verification to unlock full marketplace trust signals.
            </p>
          ) : null}
        </div>

        {needsAction ? (
          <Button asChild>
            <Link href={documentsHref}>
              {status === "rejected"
                ? "Review and resubmit verification"
                : "Complete verification"}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={documentsHref}>
              {status === "under_review"
                ? "View submitted documents"
                : "View verification documents"}
            </Link>
          </Button>
        )}
      </div>
    </SettingsSection>
  )
}
