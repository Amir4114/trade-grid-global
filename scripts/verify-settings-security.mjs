// Settings security verification (migration 012).
//
// Run AFTER migration 012 is applied:
//   node --use-system-ca scripts/verify-settings-security.mjs
//
// If migration 012 is NOT applied, exits with code 2 and manual instructions.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const serviceClient = serviceKey ? createClient(url, serviceKey) : null;

const stamp = Date.now();
const password = "TestPass123!";
let passed = 0;
let skipped = 0;
const failures = [];

function check(desc, ok, extra) {
  if (ok) {
    passed++;
    console.log(`PASS - ${desc}`);
  } else {
    failures.push({ desc, extra });
    console.log(`FAIL - ${desc}${extra ? ` :: ${JSON.stringify(extra)}` : ""}`);
  }
}

function skip(desc, reason) {
  skipped++;
  console.log(`SKIP - ${desc} (${reason})`);
}

async function signIn(email) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

async function assertMigration012Applied(companyId) {
  const probe = await supabase
    .from("companies")
    .update({ verification_status: "under_review" })
    .eq("id", companyId)
    .select("verification_status")
    .single();

  if (probe.error) {
    throw new Error(probe.error.message);
  }

  if (probe.data?.verification_status === "under_review") {
    console.error(
      "\nMigration 012 is NOT applied yet (direct under_review assignment succeeded).\n" +
        "Apply manually: supabase/migrations/012_settings_verified_identity_guard.sql\n"
    );
    process.exit(2);
  }
}

async function createSupplierFixture(suffix) {
  const email = `settings-${suffix}-${stamp}@tradegrid.test`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;

  if (serviceClient) {
    await serviceClient.from("profiles").upsert(
      { id: userId, email, role: "supplier" },
      { onConflict: "id" }
    );
    await serviceClient.from("companies").upsert(
      {
        user_id: userId,
        company_name: `Settings Test Co ${suffix}`,
        country: "India",
        account_type: "supplier",
        verification_status: "pending",
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
  } else {
    await supabase.from("profiles").upsert(
      { id: userId, email, role: "supplier" },
      { onConflict: "id" }
    );
    await supabase.from("companies").upsert(
      {
        user_id: userId,
        company_name: `Settings Test Co ${suffix}`,
        country: "India",
        account_type: "supplier",
        verification_status: "pending",
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
  }

  const client = serviceClient ?? supabase;
  const { data: company } = await client
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single();

  await signIn(email);
  return { email, userId, company };
}

try {
  const owner = await createSupplierFixture("owner");
  await assertMigration012Applied(owner.company.id);

  check("Migration 012 blocks direct under_review assignment", true);

  // Owner must be signed in — createSupplierFixture("attacker") leaves session as attacker.
  await signIn(owner.email);

  const beforeNormalEdit = await supabase
    .from("companies")
    .select("employee_count, verification_status")
    .eq("id", owner.company.id)
    .single();

  const normalEdit = await supabase
    .from("companies")
    .update({ employee_count: "51-100" })
    .eq("id", owner.company.id)
    .select("employee_count, verification_status")
    .single();

  check(
    "Owner can edit normal own-company field",
    !normalEdit.error &&
      normalEdit.data?.employee_count === "51-100" &&
      normalEdit.data?.verification_status === "pending",
    normalEdit.error
      ? {
          error: normalEdit.error,
          before: beforeNormalEdit.data,
          after: normalEdit.data,
          sessionNote: "must be owner session",
        }
      : {
          before: beforeNormalEdit.data,
          after: normalEdit.data,
        }
  );

  const attacker = await createSupplierFixture("attacker");

  await signIn(attacker.email);
  const crossCompany = await supabase
    .from("companies")
    .update({ country: "Turkey" })
    .eq("id", owner.company.id)
    .select("country")
    .maybeSingle();

  check(
    "Non-owner cannot edit another company",
    crossCompany.error || !crossCompany.data,
    crossCompany.error?.message ?? crossCompany.data
  );

  await signIn(owner.email);
  const selfVerify = await supabase
    .from("companies")
    .update({ verification_status: "verified" })
    .eq("id", owner.company.id)
    .select("verification_status")
    .single();

  check(
    "Supplier cannot directly self-assign verified",
    !selfVerify.error && selfVerify.data?.verification_status !== "verified",
    selfVerify.data
  );

  const directUnderReview = await supabase
    .from("companies")
    .update({ verification_status: "under_review" })
    .eq("id", owner.company.id)
    .select("verification_status")
    .single();

  check(
    "Supplier cannot directly assign under_review",
    !directUnderReview.error &&
      directUnderReview.data?.verification_status !== "under_review",
    directUnderReview.data
  );

  const rpcSubmit = await supabase.rpc("submit_company_for_verification", {
    company_id: owner.company.id,
  });

  check(
    "submit_company_for_verification moves pending company to under_review",
    !rpcSubmit.error && rpcSubmit.data?.verification_status === "under_review",
    rpcSubmit.error?.message ?? rpcSubmit.data
  );

  const underReviewIdentity = await supabase
    .from("companies")
    .update({ country: "Azerbaijan" })
    .eq("id", owner.company.id)
    .select("verification_status, country")
    .single();

  check(
    "Under_review sensitive identity change becomes pending",
    !underReviewIdentity.error &&
      underReviewIdentity.data?.verification_status === "pending" &&
      underReviewIdentity.data?.country === "Azerbaijan",
    underReviewIdentity.data
  );

  if (serviceClient) {
    await serviceClient
      .from("companies")
      .update({ verification_status: "verified", country: "India" })
      .eq("id", owner.company.id);

    await signIn(owner.email);

    const verifiedIdentity = await supabase
      .from("companies")
      .update({ country: "Turkey" })
      .eq("id", owner.company.id)
      .select("verification_status, country")
      .single();

    check(
      "Verified sensitive identity change becomes pending",
      !verifiedIdentity.error &&
        verifiedIdentity.data?.verification_status === "pending" &&
        verifiedIdentity.data?.country === "Turkey",
      verifiedIdentity.data
    );

    const resubmit = await supabase.rpc("submit_company_for_verification", {
      company_id: owner.company.id,
    });

    check(
      "submit_company_for_verification works after identity invalidation",
      !resubmit.error && resubmit.data?.verification_status === "under_review",
      resubmit.error?.message ?? resubmit.data
    );

    skip(
      "Admin approval/rejection flow",
      "requires trusted admin test account; not run in this script"
    );
    skip(
      "Re-verification notification row assertions",
      "requires notification table read after identity change; optional follow-up"
    );
  } else {
    skip("Verified identity reset test", "requires SUPABASE_SERVICE_ROLE_KEY");
    skip("RPC resubmit after verified invalidation", "requires SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log(`\nResults: ${passed} passed, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length > 0) process.exit(1);
} catch (err) {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
