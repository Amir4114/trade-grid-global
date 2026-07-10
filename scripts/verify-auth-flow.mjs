import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stamp = Date.now();
const password = "TestPass123!";

async function signupAndVerify(accountType, label) {
  const email = `${label}-${stamp}@tradegrid.test`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(`${label} auth failed: ${authError.message}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error(`${label} missing user id`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: `${label} Test`,
      role: accountType,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`${label} profile failed: ${profileError.message}`);
  }

  const { error: companyError } = await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Company`,
      country: "",
      business_type: "",
      company_structure: "",
      verification_status: "pending",
      risk_score: 50,
      account_type: accountType,
      onboarding_completed: false,
      onboarding_step: "business_info",
    },
    { onConflict: "user_id" }
  );

  if (companyError) {
    throw new Error(`${label} company failed: ${companyError.message}`);
  }

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("companies")
      .select("account_type, onboarding_completed")
      .eq("user_id", userId)
      .single(),
  ]);

  console.log(`\n${label.toUpperCase()} SIGNUP`);
  console.log({
    email,
    profileRole: profile?.role,
    accountType: company?.account_type,
    onboardingCompleted: company?.onboarding_completed,
  });

  const ok =
    profile?.role === accountType &&
    company?.account_type === accountType &&
    company?.onboarding_completed === false;

  if (!ok) {
    throw new Error(`${label} verification failed`);
  }

  return { email, password, userId };
}

async function loginAndVerify({ email, password, label, expectedRole }) {
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`${label} login failed: ${error.message}`);
  }

  const userId = data.user?.id;
  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single(),
  ]);

  console.log(`\n${label.toUpperCase()} LOGIN`);
  console.log({
    profileRole: profile?.role,
    onboardingCompleted: company?.onboarding_completed,
    expectedOnboardingPath:
      company?.onboarding_completed === false
        ? `/onboarding/${expectedRole}`
        : `/dashboard/${expectedRole}`,
  });

  if (profile?.role !== expectedRole) {
    throw new Error(`${label} login role mismatch`);
  }

  if (company?.onboarding_completed !== false) {
    throw new Error(`${label} should still require onboarding`);
  }
}

try {
  const buyer = await signupAndVerify("buyer", "buyer");
  const supplier = await signupAndVerify("supplier", "supplier");

  await loginAndVerify({
    ...buyer,
    label: "buyer",
    expectedRole: "buyer",
  });

  await loginAndVerify({
    ...supplier,
    label: "supplier",
    expectedRole: "supplier",
  });

  console.log("\nAll auth flow checks passed.");
} catch (error) {
  console.error("\nAuth flow check failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
