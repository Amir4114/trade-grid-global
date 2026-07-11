// Non-destructive verification of ONBOARDING COMPLETION against the live DB.
//
// verify-auth-flow.mjs proves signup + login routing while onboarding_completed
// is still false. It does NOT exercise the completion write that depends on the
// repaired schema (companies owner UPDATE policy + onboarding_step TEXT). This
// script fills that gap by replaying the exact application data contract:
//
//   lib/auth/signup.ts        -> profile + company upsert (onConflict user_id)
//   lib/auth/onboarding.ts    -> saveBuyerOnboarding / saveSupplierOnboarding
//                                (companies UPDATE: onboarding_step='completed',
//                                 onboarding_completed=true)
//   lib/auth/redirects.ts +   -> resolvePostAuthRedirectPath: a completed
//   lib/dashboard/roles.ts       buyer/supplier must resolve to /dashboard/<role>
//
// It creates fresh, uniquely-named test users only. It does NOT modify or delete
// any real/production data. Created test accounts are printed at the end.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stamp = Date.now();
const password = "TestPass123!";
const createdTestAccounts = [];

// Mirror of resolvePostAuthRedirectPath for a completed, non-admin user.
function expectedCompletedPath(role) {
  return `/dashboard/${role}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCompletionFlow(role, label) {
  const email = `complete-${label}-${stamp}@tradegrid.test`;

  // 1) Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(`${label} signUp: ${authError.message}`);
  const userId = authData.user?.id;
  assert(userId, `${label} missing user id`);
  createdTestAccounts.push({ email, userId });

  // 2) Profile upsert (mirrors lib/auth/signup.ts)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, full_name: `${label} Test`, role }, { onConflict: "id" });
  if (profileError) throw new Error(`${label} profile upsert: ${profileError.message}`);

  // 3) Company upsert (mirrors lib/auth/signup.ts)
  const { error: companyError } = await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Company`,
      country: "",
      business_type: "",
      company_structure: "",
      verification_status: "pending",
      risk_score: 50,
      account_type: role,
      onboarding_completed: false,
      onboarding_step: "business_info",
    },
    { onConflict: "user_id" }
  );
  if (companyError) throw new Error(`${label} company upsert: ${companyError.message}`);

  // 4) Onboarding completion UPDATE (mirrors lib/auth/onboarding.ts payloads)
  const commonPayload = {
    business_type: role === "buyer" ? "Importer" : "Manufacturer",
    company_structure: "LLC",
    employee_count: "11-50",
    categories: ["Rice", "Spices"],
    onboarding_step: "completed",
    onboarding_completed: true,
    account_type: role,
    updated_at: new Date().toISOString(),
  };
  const rolePayload =
    role === "buyer"
      ? {
          annual_purchase_volume: "1M-5M",
          target_markets: ["India", "United Arab Emirates"],
          required_certifications: ["ISO 22000"],
        }
      : {
          year_established: "2015",
          export_markets: ["India", "United Arab Emirates"],
          certifications: ["ISO 22000"],
        };

  const { data: updated, error: updateError } = await supabase
    .from("companies")
    .update({ ...commonPayload, ...rolePayload })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) throw new Error(`${label} onboarding UPDATE: ${updateError.message}`);

  // 5) Verify persisted completion state
  assert(
    updated.onboarding_step === "completed",
    `${label} onboarding_step expected 'completed', got ${JSON.stringify(updated.onboarding_step)}`
  );
  assert(
    updated.onboarding_completed === true,
    `${label} onboarding_completed expected true, got ${JSON.stringify(updated.onboarding_completed)}`
  );
  assert(
    updated.account_type === role,
    `${label} account_type expected ${role}, got ${JSON.stringify(updated.account_type)}`
  );

  // 6) Verify routing contract for a completed user
  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase.from("companies").select("onboarding_completed").eq("user_id", userId).single(),
  ]);
  const resolved =
    company?.onboarding_completed === true
      ? expectedCompletedPath(profile?.role)
      : `/onboarding/${profile?.role}`;

  console.log(`\n${label.toUpperCase()} ONBOARDING COMPLETION`);
  console.log({
    onboarding_step: updated.onboarding_step,
    onboarding_completed: updated.onboarding_completed,
    account_type: updated.account_type,
    resolvedRedirect: resolved,
  });

  assert(
    resolved === expectedCompletedPath(role),
    `${label} resolved redirect expected ${expectedCompletedPath(role)}, got ${resolved}`
  );
}

try {
  await runCompletionFlow("buyer", "buyer");
  await runCompletionFlow("supplier", "supplier");
  console.log("\nAll onboarding-completion checks passed.");
  console.log("\nTest accounts created (not cleaned up; anon key cannot delete auth users):");
  for (const acct of createdTestAccounts) console.log(`  - ${acct.email} (${acct.userId})`);
} catch (error) {
  console.error("\nOnboarding-completion check failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
