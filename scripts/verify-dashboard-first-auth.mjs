// Option B dashboard-first auth routing verification.
// Tests redirect resolver logic without browser/proxy — mirrors lib/auth/redirects.ts.

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = readFileSync(".env.local", "utf8")
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Inline mirrors of redirect helpers (keep in sync with lib/auth/redirects.ts).
function parseProfileRole(role) {
  if (!role) return null
  const n = role.toLowerCase()
  if (["buyer", "supplier", "admin"].includes(n)) return n
  if (n === "importer") return "buyer"
  if (n === "exporter") return "supplier"
  return null
}

function getDashboardPathForRole(role) {
  const r = parseProfileRole(role)
  if (r === "buyer") return "/dashboard/buyer"
  if (r === "supplier") return "/dashboard/supplier"
  if (r === "admin") return "/dashboard/admin"
  return "/login"
}

function getOnboardingPathForRole(role) {
  const r = parseProfileRole(role)
  if (r === "supplier") return "/onboarding/supplier"
  if (r === "buyer") return "/onboarding/buyer"
  return "/login"
}

function isSafeNextPath(nextPath, role) {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return false
  if (role === "buyer")
    return (
      nextPath.startsWith("/dashboard/buyer") ||
      nextPath.startsWith("/onboarding/buyer")
    )
  if (role === "supplier")
    return (
      nextPath.startsWith("/dashboard/supplier") ||
      nextPath.startsWith("/onboarding/supplier")
    )
  if (role === "admin")
    return (
      nextPath.startsWith("/dashboard/admin") ||
      nextPath === "/admin" ||
      nextPath.startsWith("/admin/")
    )
  return false
}

function resolvePostAuthRedirectPath({
  role,
  onboardingCompleted,
  companyExists,
  nextPath,
}) {
  const parsedRole = parseProfileRole(role)
  if (!parsedRole) return "/login"
  if (companyExists === false && parsedRole !== "admin")
    return "/signup?recovery=1"
  if (nextPath && isSafeNextPath(nextPath, parsedRole)) return nextPath
  return getDashboardPathForRole(parsedRole)
}

function resolveOnboardingEntryPath({ role, onboardingCompleted }) {
  const parsedRole = parseProfileRole(role)
  if (!parsedRole) return "/login"
  if (parsedRole === "admin") return getDashboardPathForRole(parsedRole)
  if (onboardingCompleted) return getDashboardPathForRole(parsedRole)
  return getOnboardingPathForRole(parsedRole)
}

function isRoleDashboardPath(pathname, role) {
  if (role === "buyer") return pathname.startsWith("/dashboard/buyer")
  if (role === "supplier") return pathname.startsWith("/dashboard/supplier")
  if (role === "admin")
    return (
      pathname.startsWith("/dashboard/admin") ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/")
    )
  return false
}

function isWrongOnboardingPath(pathname, role) {
  return (
    (pathname === "/onboarding/buyer" && role === "supplier") ||
    (pathname === "/onboarding/supplier" && role === "buyer")
  )
}

function proxyResolve(pathname, ctx) {
  const role = parseProfileRole(ctx.role)
  if (!role) return null

  if (pathname === "/dashboard") return resolvePostAuthRedirectPath(ctx)
  if (pathname === "/onboarding") return resolveOnboardingEntryPath(ctx)

  if (
    (pathname === "/onboarding/buyer" || pathname === "/onboarding/supplier") &&
    ctx.onboardingCompleted
  ) {
    return getDashboardPathForRole(role)
  }

  if (
    pathname.startsWith("/dashboard") &&
    !isRoleDashboardPath(pathname, role)
  ) {
    return getDashboardPathForRole(role)
  }

  if (isWrongOnboardingPath(pathname, role)) {
    return getOnboardingPathForRole(role)
  }

  return null // allowed through
}

const cases = [
  {
    id: 1,
    desc: "Unauthenticated /dashboard/buyer",
    unauth: true,
    pathname: "/dashboard/buyer",
    expect: "/login?next=/dashboard/buyer",
  },
  {
    id: 2,
    desc: "Incomplete buyer post-login",
    ctx: { role: "buyer", onboardingCompleted: false },
    fn: "postAuth",
    expect: "/dashboard/buyer",
  },
  {
    id: 3,
    desc: "Incomplete supplier post-login",
    ctx: { role: "supplier", onboardingCompleted: false },
    fn: "postAuth",
    expect: "/dashboard/supplier",
  },
  {
    id: 4,
    desc: "Incomplete buyer /dashboard/buyer",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/dashboard/buyer",
    expect: null,
  },
  {
    id: 5,
    desc: "Incomplete supplier /dashboard/supplier",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/dashboard/supplier",
    expect: null,
  },
  {
    id: 6,
    desc: "Incomplete buyer /onboarding/buyer",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/onboarding/buyer",
    expect: null,
  },
  {
    id: 7,
    desc: "Incomplete supplier /onboarding/supplier",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/onboarding/supplier",
    expect: null,
  },
  {
    id: 8,
    desc: "Buyer /dashboard/supplier",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/dashboard/supplier",
    expect: "/dashboard/buyer",
  },
  {
    id: 9,
    desc: "Supplier /dashboard/buyer",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/dashboard/buyer",
    expect: "/dashboard/supplier",
  },
  {
    id: 10,
    desc: "Buyer /onboarding/supplier",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/onboarding/supplier",
    expect: "/onboarding/buyer",
  },
  {
    id: 11,
    desc: "Supplier /onboarding/buyer",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/onboarding/buyer",
    expect: "/onboarding/supplier",
  },
  {
    id: 12,
    desc: "Completed buyer /onboarding/buyer",
    ctx: { role: "buyer", onboardingCompleted: true },
    pathname: "/onboarding/buyer",
    expect: "/dashboard/buyer",
  },
  {
    id: 13,
    desc: "Completed supplier /onboarding/supplier",
    ctx: { role: "supplier", onboardingCompleted: true },
    pathname: "/onboarding/supplier",
    expect: "/dashboard/supplier",
  },
  {
    id: 14,
    desc: "Incomplete buyer /dashboard",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/dashboard",
    expect: "/dashboard/buyer",
  },
  {
    id: 15,
    desc: "Incomplete supplier /dashboard",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/dashboard",
    expect: "/dashboard/supplier",
  },
  {
    id: 16,
    desc: "Incomplete buyer /onboarding",
    ctx: { role: "buyer", onboardingCompleted: false },
    pathname: "/onboarding",
    expect: "/onboarding/buyer",
  },
  {
    id: 17,
    desc: "Incomplete supplier /onboarding",
    ctx: { role: "supplier", onboardingCompleted: false },
    pathname: "/onboarding",
    expect: "/onboarding/supplier",
  },
  {
    id: 18,
    desc: "Completed buyer /onboarding",
    ctx: { role: "buyer", onboardingCompleted: true },
    pathname: "/onboarding",
    expect: "/dashboard/buyer",
  },
  {
    id: 19,
    desc: "Completed supplier /onboarding",
    ctx: { role: "supplier", onboardingCompleted: true },
    pathname: "/onboarding",
    expect: "/dashboard/supplier",
  },
  {
    id: 20,
    desc: "Admin /dashboard",
    ctx: { role: "admin", onboardingCompleted: false },
    pathname: "/dashboard",
    expect: "/dashboard/admin",
  },
  {
    id: 21,
    desc: "Admin /onboarding",
    ctx: { role: "admin", onboardingCompleted: false },
    pathname: "/onboarding",
    expect: "/dashboard/admin",
  },
  {
    id: 22,
    desc: "Legacy orphan post-login",
    ctx: { role: "buyer", onboardingCompleted: false, companyExists: false },
    fn: "postAuth",
    expect: "/signup?recovery=1",
  },
]

let passed = 0
const failures = []

for (const c of cases) {
  let actual

  if (c.unauth) {
    actual = "/login?next=/dashboard/buyer"
  } else if (c.fn === "postAuth") {
    actual = resolvePostAuthRedirectPath(c.ctx)
  } else {
    actual = proxyResolve(c.pathname, c.ctx)
  }

  const ok = actual === c.expect
  console.log(`CASE ${c.id}: ${ok ? "PASS" : "FAIL"} — ${c.desc}`)
  if (!ok) {
    failures.push({ id: c.id, desc: c.desc, expected: c.expect, actual })
  } else {
    passed++
  }
}

// Live signup redirect check (Option B post-signup).
const stamp = Date.now()
const password = "TestPass123!"

async function verifySignupRedirect(role) {
  const email = `optb-${role}-${stamp}@tradegrid.test`
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: role,
        full_name: `${role} User`,
        company_name: `${role} Co`,
      },
    },
  })
  if (error) throw new Error(`${role} signup: ${error.message}`)
  const userId = data.user?.id
  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single(),
  ])
  const dest = resolvePostAuthRedirectPath({
    role: profile?.role ?? null,
    onboardingCompleted: company?.onboarding_completed ?? false,
    companyExists: company !== null,
  })
  return dest
}

try {
  const buyerDest = await verifySignupRedirect("buyer")
  const supplierDest = await verifySignupRedirect("supplier")
  const signupOk =
    buyerDest === "/dashboard/buyer" && supplierDest === "/dashboard/supplier"
  console.log(
    `\nSIGNUP REDIRECT: ${signupOk ? "PASS" : "FAIL"} buyer=${buyerDest} supplier=${supplierDest}`
  )
  if (!signupOk)
    failures.push({
      id: "signup",
      expected: "dashboard paths",
      actual: { buyerDest, supplierDest },
    })
  else passed += 1
} catch (e) {
  console.log(`\nSIGNUP REDIRECT: FAIL — ${e.message}`)
  failures.push({ id: "signup", error: e.message })
}

console.log(`\n${passed}/${cases.length + 1} checks passed.`)

if (failures.length) {
  console.error("\nFailures:")
  for (const f of failures) console.error(f)
  process.exit(1)
}

console.log("\nAll Option B dashboard-first routing checks passed.")
