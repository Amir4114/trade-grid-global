import {
  isRoleDashboardPath,
  resolvePostAuthRedirectPath,
  shouldRedirectOnboardingWorkspaceToDashboard,
} from "../lib/auth/redirects"
import {
  canPerformTrustSensitiveActions,
  getVerificationGuidance,
  getVerificationProgress,
} from "../lib/verification/access"

const checks: Array<{ label: string; condition: boolean }> = [
  {
    label: "under-review Buyer lands on Workspace Overview",
    condition:
      resolvePostAuthRedirectPath({
        role: "buyer",
        companyExists: true,
        onboardingCompleted: true,
        verificationStatus: "under_review",
      }) === "/dashboard/buyer",
  },
  {
    label: "under-review Supplier lands on Workspace Overview",
    condition:
      resolvePostAuthRedirectPath({
        role: "supplier",
        companyExists: true,
        onboardingCompleted: true,
        verificationStatus: "under_review",
      }) === "/dashboard/supplier",
  },
  {
    label: "under-review status cannot perform trust-sensitive actions",
    condition: !canPerformTrustSensitiveActions("under_review"),
  },
  {
    label: "submitted onboarding redirects to Workspace Overview",
    condition: shouldRedirectOnboardingWorkspaceToDashboard({
      role: "buyer",
      companyExists: true,
      onboardingCompleted: true,
      verificationStatus: "under_review",
    }),
  },
  {
    label: "rejected onboarding remains accessible for resubmission",
    condition: !shouldRedirectOnboardingWorkspaceToDashboard({
      role: "buyer",
      companyExists: true,
      onboardingCompleted: true,
      verificationStatus: "rejected",
    }),
  },
  {
    label: "verified status can perform trust-sensitive actions",
    condition: canPerformTrustSensitiveActions("verified"),
  },
  {
    label: "under-review progress remains non-terminal",
    condition: getVerificationProgress("under_review") === 75,
  },
  {
    label: "under-review guidance preserves marketplace browsing",
    condition: getVerificationGuidance("under_review").includes(
      "marketplace browsing remain available"
    ),
  },
  {
    label: "Buyer Analytics belongs to Buyer workspace",
    condition: isRoleDashboardPath("/dashboard/buyer/analytics", "buyer"),
  },
  {
    label: "Supplier Analytics belongs to Supplier workspace",
    condition: isRoleDashboardPath("/dashboard/supplier/analytics", "supplier"),
  },
  {
    label: "similarly prefixed Buyer path is rejected",
    condition: !isRoleDashboardPath("/dashboard/buyer-archive", "buyer"),
  },
  {
    label: "similarly prefixed admin path is rejected",
    condition: !isRoleDashboardPath("/administer", "admin"),
  },
  {
    label: "Buyer fulfillment deep link survives authentication",
    condition:
      resolvePostAuthRedirectPath({
        role: "buyer",
        companyExists: true,
        onboardingCompleted: true,
        verificationStatus: "verified",
        nextPath:
          "/dashboard/buyer/orders?tab=fulfillment&id=00000000-0000-0000-0000-000000000000",
      }) ===
      "/dashboard/buyer/orders?tab=fulfillment&id=00000000-0000-0000-0000-000000000000",
  },
  {
    label: "Cross-role fulfillment deep link is rejected",
    condition:
      resolvePostAuthRedirectPath({
        role: "buyer",
        companyExists: true,
        onboardingCompleted: true,
        verificationStatus: "verified",
        nextPath: "/dashboard/supplier/orders?tab=fulfillment",
      }) === "/dashboard/buyer",
  },
]

let passed = 0

for (const check of checks) {
  if (!check.condition) {
    console.error(`FAIL - ${check.label}`)
    process.exitCode = 1
  } else {
    passed += 1
    console.log(`PASS - ${check.label}`)
  }
}

console.log(
  `\nMarketplace experience verification: ${passed}/${checks.length} passed`
)
