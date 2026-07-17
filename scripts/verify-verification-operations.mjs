// Verification operations verification (migration 013).
//
// Run AFTER migration 013 is manually applied:
//   node --use-system-ca scripts/verify-verification-operations.mjs

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

async function assertMigration013Applied() {
  const probe = await supabase.from("verification_cases").select("id").limit(1);
  if (probe.error?.message?.includes("Could not find the table")) {
    console.error(
      "\nMigration 013 is NOT applied yet (verification_cases missing).\n" +
        "Apply manually: supabase/migrations/013_verification_operations_foundation.sql\n"
    );
    process.exit(2);
  }
  if (probe.error && probe.error.code === "42P01") {
    console.error(
      "\nMigration 013 is NOT applied yet (verification_cases missing).\n" +
        "Apply manually: supabase/migrations/013_verification_operations_foundation.sql\n"
    );
    process.exit(2);
  }
}

async function createSupplierWithCompany() {
  const email = `vops-supplier-${stamp}@tradegrid.test`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;
  const writer = serviceClient ?? supabase;

  await writer.from("profiles").upsert(
    { id: userId, email, role: "supplier" },
    { onConflict: "id" }
  );
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `VOps Supplier ${stamp}`,
      country: "India",
      account_type: "supplier",
      verification_status: "pending",
      onboarding_completed: true,
    },
    { onConflict: "user_id" }
  );

  const { data: company } = await writer
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single();

  await signIn(email);
  return { email, userId, company };
}

async function createBuyerWithCompany() {
  const email = `vops-buyer-${stamp}@tradegrid.test`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;
  const writer = serviceClient ?? supabase;

  await writer.from("profiles").upsert(
    { id: userId, email, role: "buyer" },
    { onConflict: "id" }
  );
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `VOps Buyer ${stamp}`,
      country: "India",
      account_type: "buyer",
      verification_status: "pending",
      onboarding_completed: true,
    },
    { onConflict: "user_id" }
  );

  await signIn(email);
  return { email, userId };
}

try {
  await assertMigration013Applied();
  check("Migration 013 verification_cases table reachable", true);

  const supplier = await createSupplierWithCompany();
  const buyer = await createBuyerWithCompany();

  const supplierInsertCase = await supabase.from("verification_cases").insert({
    case_type: "company_verification",
    entity_id: supplier.company.id,
    status: "pending",
    priority: "normal",
    submitted_at: new Date().toISOString(),
    sla_due_at: new Date(Date.now() + 86400000).toISOString(),
    source: "user_submission",
  });

  check(
    "Supplier cannot create arbitrary verification cases",
    Boolean(supplierInsertCase.error),
    supplierInsertCase.error?.message
  );

  await signIn(buyer.email);
  const buyerInsertCase = await supabase.from("verification_cases").insert({
    case_type: "company_verification",
    entity_id: supplier.company.id,
    status: "pending",
    priority: "normal",
    submitted_at: new Date().toISOString(),
    sla_due_at: new Date(Date.now() + 86400000).toISOString(),
    source: "user_submission",
  });

  check(
    "Buyer cannot create arbitrary verification cases",
    Boolean(buyerInsertCase.error),
    buyerInsertCase.error?.message
  );

  await signIn(supplier.email);
  const { data: casesBefore } = await supabase
    .from("verification_cases")
    .select("id")
    .eq("case_type", "company_verification")
    .eq("entity_id", supplier.company.id);

  check(
    "Supplier cannot read verification cases directly",
    Boolean(casesBefore?.length === 0 || casesBefore === null),
    casesBefore
  );

  const submitCompany = await supabase.rpc("submit_company_for_verification", {
    company_id: supplier.company.id,
  });

  check(
    "Company submission succeeds",
    !submitCompany.error && submitCompany.data?.verification_status === "under_review",
    submitCompany.error?.message ?? submitCompany.data
  );

  if (serviceClient) {
    const { data: adminCases } = await serviceClient
      .from("verification_cases")
      .select("*")
      .eq("case_type", "company_verification")
      .eq("entity_id", supplier.company.id)
      .in("status", ["pending", "in_review"]);

    check(
      "Company submission creates active verification case",
      (adminCases ?? []).length === 1,
      adminCases
    );

    const caseId = adminCases?.[0]?.id;
    const { data: events } = await serviceClient
      .from("verification_case_events")
      .select("*")
      .eq("case_id", caseId)
      .eq("event_type", "case.submitted");

    check(
      "Company submission creates submitted audit event",
      (events ?? []).length >= 1,
      events
    );

    const dupSubmit = await supabase.rpc("submit_company_for_verification", {
      company_id: supplier.company.id,
    });

    check(
      "Duplicate submit blocked while under_review",
      Boolean(dupSubmit.error),
      dupSubmit.error?.message
    );

    const { data: casesAfterDup } = await serviceClient
      .from("verification_cases")
      .select("id")
      .eq("case_type", "company_verification")
      .eq("entity_id", supplier.company.id)
      .in("status", ["pending", "in_review"]);

    check(
      "No duplicate active company case created",
      (casesAfterDup ?? []).length === 1,
      casesAfterDup
    );
  } else {
    skip("Company case/event assertions", "requires SUPABASE_SERVICE_ROLE_KEY");
    skip("Duplicate active case assertion", "requires SUPABASE_SERVICE_ROLE_KEY");
  }

  await signIn(supplier.email);
  const startReview = await supabase.rpc("start_verification_case_review", {
    p_case_id: "00000000-0000-0000-0000-000000000001",
  });

  check(
    "Non-admin cannot start review",
    Boolean(startReview.error),
    startReview.error?.message
  );

  const setPriority = await supabase.rpc("set_verification_case_priority", {
    p_case_id: "00000000-0000-0000-0000-000000000001",
    p_priority: "urgent",
  });

  check(
    "Supplier cannot change case priority",
    Boolean(setPriority.error),
    setPriority.error?.message
  );

  const fakeEvent = await supabase.from("verification_case_events").insert({
    case_id: "00000000-0000-0000-0000-000000000001",
    event_type: "case.approved",
    actor_type: "user",
  });

  check(
    "Supplier cannot create fake audit events",
    Boolean(fakeEvent.error),
    fakeEvent.error?.message
  );

  const fakeAssessment = await supabase.from("verification_assessments").insert({
    case_id: "00000000-0000-0000-0000-000000000001",
    assessor_type: "ai",
    assessor_name: "Fake AI",
    assessment_type: "document_completeness",
    result: "pass",
  });

  check(
    "Supplier cannot create fake AI assessments",
    Boolean(fakeAssessment.error),
    fakeAssessment.error?.message
  );

  const selfApproveCompany = await supabase.rpc("approve_company_verification", {
    p_company_id: supplier.company.id,
  });

  check(
    "Supplier cannot approve company verification",
    Boolean(selfApproveCompany.error),
    selfApproveCompany.error?.message
  );

  if (serviceClient) {
    skip(
      "Admin-positive review/decision tests",
      "requires trusted admin test account; not run in this script"
    );
    skip(
      "Product submission case tests",
      "requires supplier product fixture; run via verify-product-system after 013 apply"
    );
  } else {
    skip("Admin-positive tests", "requires SUPABASE_SERVICE_ROLE_KEY");
    skip("Product case creation tests", "requires SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log(`\nResults: ${passed} passed, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length > 0) process.exit(1);
} catch (err) {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
