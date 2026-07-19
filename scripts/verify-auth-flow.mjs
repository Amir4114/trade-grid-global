import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = readFileSync(".env.local", "utf8")
for (const line of env.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    process.env[match[1].trim()] = match[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const stamp = Date.now()
const password = "TestPass123!"

async function signupAndVerify(accountType, label) {
  const email = `${label}-${stamp}@tradegrid.test`
  const fullName = `${label} Test`
  const companyName = `${label} Company`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: accountType,
        full_name: fullName,
        company_name: companyName,
      },
    },
  })

  if (authError) {
    throw new Error(`${label} auth failed: ${authError.message}`)
  }

  const userId = authData.user?.id
  if (!userId) {
    throw new Error(`${label} missing user id`)
  }

  const [
    { data: profile, error: profileError },
    { data: company, error: companyError },
    { data: welcome, error: welcomeError },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("companies")
      .select("account_type, onboarding_completed")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("notifications")
      .select("action_url, metadata")
      .eq("recipient_user_id", userId)
      .eq("type", "account.welcome")
      .single(),
  ])

  if (profileError || companyError || welcomeError) {
    throw new Error(
      `${label} atomic provisioning failed: ${
        profileError?.message ?? companyError?.message ?? welcomeError?.message
      }`
    )
  }

  console.log(`\n${label.toUpperCase()} SIGNUP`)
  console.log({
    email,
    profileRole: profile?.role,
    accountType: company?.account_type,
    onboardingCompleted: company?.onboarding_completed,
    welcomePath: welcome?.action_url,
  })

  const ok =
    profile?.role === accountType &&
    company?.account_type === accountType &&
    company?.onboarding_completed === false &&
    welcome?.action_url === `/onboarding/${accountType}` &&
    welcome?.metadata?.role === accountType

  if (!ok) {
    throw new Error(`${label} verification failed`)
  }

  return { email, password, userId }
}

async function verifyFailedSignupRollsBackAuth() {
  await supabase.auth.signOut()

  const email = `atomic-rollback-${stamp}@tradegrid.test`
  const invalidAttempt = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: "admin",
        full_name: "Atomic Rollback",
        company_name: "Atomic Rollback Company",
      },
    },
  })

  if (!invalidAttempt.error) {
    throw new Error("invalid marketplace signup should fail")
  }

  const validRetry = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: "buyer",
        full_name: "Atomic Rollback",
        company_name: "Atomic Rollback Company",
      },
    },
  })

  if (validRetry.error || !validRetry.data.user) {
    throw new Error(
      `failed signup left an orphaned Auth user: ${validRetry.error?.message}`
    )
  }

  console.log("\nATOMIC ROLLBACK")
  console.log("Invalid provisioning rolled back Auth; same email was reusable.")
}

async function verifyLegacyOrphanRecovery() {
  await supabase.auth.signOut()

  const email = `legacy-recovery-${stamp}@tradegrid.test`
  const signup = await supabase.auth.signUp({ email, password })
  if (signup.error || !signup.data.user) {
    throw new Error(`legacy orphan seed failed: ${signup.error?.message}`)
  }

  const { data: recoveredCompany, error: recoveryError } = await supabase.rpc(
    "recover_incomplete_marketplace_account",
    {
      p_full_name: "Recovered Supplier",
      p_company_name: "Recovered Supplier Company",
      p_account_type: "supplier",
    }
  )

  if (recoveryError || recoveredCompany?.account_type !== "supplier") {
    throw new Error(`legacy recovery failed: ${recoveryError?.message}`)
  }

  const { data: recoveredProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signup.data.user.id)
    .single()

  if (profileError || recoveredProfile?.role !== "supplier") {
    throw new Error(`legacy recovery role failed: ${profileError?.message}`)
  }

  const { data: welcome, error: welcomeError } = await supabase
    .from("notifications")
    .select("action_url, metadata")
    .eq("recipient_user_id", signup.data.user.id)
    .eq("type", "account.welcome")
    .single()

  if (
    welcomeError ||
    welcome?.action_url !== "/onboarding/supplier" ||
    welcome?.metadata?.role !== "supplier"
  ) {
    throw new Error(`legacy recovery welcome failed: ${welcomeError?.message}`)
  }

  console.log("\nLEGACY ORPHAN RECOVERY")
  console.log(
    "Missing marketplace records recovered transactionally as supplier."
  )
}

async function loginAndVerify({ email, password, label, expectedRole }) {
  await supabase.auth.signOut()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`${label} login failed: ${error.message}`)
  }

  const userId = data.user?.id
  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single(),
  ])

  console.log(`\n${label.toUpperCase()} LOGIN`)
  console.log({
    profileRole: profile?.role,
    onboardingCompleted: company?.onboarding_completed,
    expectedDashboardPath: `/dashboard/${expectedRole}`,
  })

  if (profile?.role !== expectedRole) {
    throw new Error(`${label} login role mismatch`)
  }

  if (company?.onboarding_completed !== false) {
    throw new Error(`${label} should still have incomplete onboarding`)
  }
}

async function verifyRoleGuardAndDuplicatePrevention(account) {
  await supabase.auth.signOut()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })
  if (signInError) throw new Error(signInError.message)

  const roleChange = await supabase
    .from("profiles")
    .update({ role: "buyer" })
    .eq("id", account.userId)

  if (
    !roleChange.error ||
    !/Marketplace role cannot be changed after registration/i.test(
      roleChange.error.message
    )
  ) {
    throw new Error(
      "marketplace role guard did not reject a direct role change"
    )
  }

  const duplicateProvisioning = await supabase.rpc(
    "recover_incomplete_marketplace_account",
    {
      p_full_name: "Duplicate Supplier",
      p_company_name: "Duplicate Supplier Company",
      p_account_type: "supplier",
    }
  )

  if (duplicateProvisioning.error?.code !== "23505") {
    throw new Error("duplicate marketplace provisioning was not rejected")
  }

  console.log("\nROLE AND DUPLICATE GUARDS")
  console.log("Role mutation and duplicate provisioning were rejected.")
}

try {
  await verifyFailedSignupRollsBackAuth()
  await verifyLegacyOrphanRecovery()

  const buyer = await signupAndVerify("buyer", "buyer")
  const supplier = await signupAndVerify("supplier", "supplier")

  await verifyRoleGuardAndDuplicatePrevention(supplier)

  await loginAndVerify({
    ...buyer,
    label: "buyer",
    expectedRole: "buyer",
  })

  await loginAndVerify({
    ...supplier,
    label: "supplier",
    expectedRole: "supplier",
  })

  console.log("\nAll auth flow checks passed.")
} catch (error) {
  console.error("\nAuth flow check failed:")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
