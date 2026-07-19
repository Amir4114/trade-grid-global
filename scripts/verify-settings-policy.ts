import {
  detectSensitiveCompanyChanges,
  isVerifiedCompany,
  requiresReverification,
} from "../lib/settings/policy"

function check(desc: string, ok: boolean) {
  if (ok) {
    console.log(`PASS - ${desc}`)
    return true
  }
  console.log(`FAIL - ${desc}`)
  return false
}

const verifiedCompany = {
  verification_status: "verified",
  company_name: "Acme Foods",
  country: "India",
  business_type: "Exporter",
  company_structure: "Private Limited Company",
} as const

let passed = 0
let failed = 0

function run(desc: string, ok: boolean) {
  if (check(desc, ok)) passed++
  else failed++
}

run(
  "detects company_name change on verified company",
  detectSensitiveCompanyChanges(verifiedCompany as never, {
    company_name: "New Name",
  }).includes("company_name")
)

run(
  "detects country change on verified company",
  detectSensitiveCompanyChanges(verifiedCompany as never, {
    country: "Azerbaijan",
  }).includes("country")
)

run(
  "detects business type change on verified company",
  detectSensitiveCompanyChanges(verifiedCompany as never, {
    business_type: "Manufacturer",
  }).includes("business_type")
)

run(
  "detects company structure change on verified company",
  detectSensitiveCompanyChanges(verifiedCompany as never, {
    company_structure: "Corporation",
  }).includes("company_structure")
)

run(
  "ignores non-sensitive field changes",
  detectSensitiveCompanyChanges(verifiedCompany as never, {
    company_name: "Acme Foods",
    country: "India",
    business_type: "Exporter",
    company_structure: "Private Limited Company",
  }).length === 0
)

run(
  "requires reverification for verified identity change",
  requiresReverification(verifiedCompany as never, { country: "Turkey" })
)

run(
  "requires reverification for under_review identity change",
  requiresReverification(
    { ...verifiedCompany, verification_status: "under_review" } as never,
    { country: "Turkey" }
  )
)

run(
  "does not require reverification for pending company",
  !requiresReverification(
    { ...verifiedCompany, verification_status: "pending" } as never,
    { country: "Turkey" }
  )
)

run(
  "isVerifiedCompany identifies verified status",
  isVerifiedCompany({ verification_status: "verified" } as never)
)

console.log(
  `\nSettings policy verification: ${passed} passed, ${failed} failed`
)
if (failed > 0) process.exit(1)
