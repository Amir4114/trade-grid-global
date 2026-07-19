import { readFileSync } from "node:fs"

import {
  parsePublicCompanySlug,
  publicCompanyPath,
  slugifyCompanyName,
} from "../lib/marketplace/company-url"

const companyId = "123e4567-e89b-42d3-a456-426614174000"
const buyerOverview = readFileSync("app/dashboard/buyer/page.tsx", "utf8")
const supplierOverview = readFileSync("app/dashboard/supplier/page.tsx", "utf8")

const checks: Array<{ label: string; condition: boolean }> = [
  {
    label: "company names produce stable SEO slugs",
    condition:
      slugifyCompanyName("Ácme Foods & Spices Ltd.") ===
      "acme-foods-spices-ltd",
  },
  {
    label: "public company URLs retain immutable company identity",
    condition:
      publicCompanyPath("Acme Foods", companyId) ===
      `/company/acme-foods--${companyId}`,
  },
  {
    label: "canonical public company slug resolves its company ID",
    condition: parsePublicCompanySlug(`acme-foods--${companyId}`) === companyId,
  },
  {
    label: "malformed public company slugs fail closed",
    condition: parsePublicCompanySlug("acme-foods--not-an-id") === null,
  },
  {
    label: "legacy fixture suppliers keep their existing route",
    condition:
      publicCompanyPath("Legacy Supplier", "supplier-1") ===
      "/suppliers/supplier-1",
  },
  {
    label: "workspace overviews do not present fixture marketplace activity",
    condition:
      !buyerOverview.includes("@/lib/marketplace/data") &&
      !supplierOverview.includes("@/lib/marketplace/data"),
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

console.log(`\nMarketplace Foundation M1.1: ${passed}/${checks.length} passed`)
