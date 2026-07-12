// Product System Phase 1 verification (security-hardened).
//
// Exercises the real Supabase product lifecycle and, critically, the admin
// authorization model against the LIVE database using the anon key (same
// approach as the other verify-*.mjs scripts).
//
// SECURITY CONTRACT enforced here:
//   * A normal authenticated buyer/supplier MUST NOT be able to set their own
//     profiles.role = 'admin' (migration 007 trigger).
//   * A legitimate admin is provisioned ONLY through a trusted mechanism
//     (service-role key). This script NEVER promotes an ordinary authenticated
//     user to admin via its own profile UPDATE access — doing so would exploit
//     the very vulnerability under test.
//
// Requires migration 006 (products) AND migration 007 (role hardening) applied.
// If SUPABASE_SERVICE_ROLE_KEY is not set, the positive admin tests
// (approve/reject -> published/rejected) are SKIPPED and reported as requiring
// manual trusted provisioning. Negative security tests still run.
//
// Run: node --use-system-ca scripts/verify-product-system.mjs

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

const supabase = createClient(url, anonKey);
const serviceClient = serviceKey ? createClient(url, serviceKey) : null;
const adminAvailable = Boolean(serviceClient);

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

function skip(desc) {
  skipped++;
  console.log(`SKIP - ${desc}`);
}

function fatal(message) {
  console.error(`\nFATAL: ${message}`);
  process.exit(1);
}

async function signUp(label, role) {
  const email = `prod-${role}-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;
  await supabase.from("profiles").upsert({ id: userId, email, role }, { onConflict: "id" });
  await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Co`,
      account_type: role,
      onboarding_completed: false,
      onboarding_step: "business_info",
    },
    { onConflict: "user_id" }
  );
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .single();
  return { email, userId, companyId: company?.id };
}

async function signIn(email) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fatal(`sign in failed for ${email}: ${error.message}`);
}

async function assertCannotSelfPromote(who, userId) {
  const promote = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId)
    .select("role");
  const after = await supabase.from("profiles").select("role").eq("id", userId).single();
  check(
    `${who} CANNOT self-promote to admin (DB trigger)`,
    (!!promote.error || (promote.data?.length ?? 0) === 0) && after.data?.role !== "admin",
    { updateError: promote.error?.message, roleAfter: after.data?.role }
  );
  const { data: isAdmin, error: isAdminError } = await supabase.rpc("is_admin");
  check(`${who} is_admin() = false`, !isAdminError && isAdmin === false, {
    isAdmin,
    isAdminError: isAdminError?.message,
  });
}

async function createDraft(companyId, userId, name) {
  return supabase
    .from("products")
    .insert({ company_id: companyId, created_by: userId, name, category: "Rice", status: "draft" })
    .select("*")
    .single();
}

try {
  // ---- supplier 1: product lifecycle + self-promotion guard --------------
  const supplier1 = await signUp("s1", "supplier");

  const draft1 = await createDraft(supplier1.companyId, supplier1.userId, "Basmati Draft");
  if (draft1.error) {
    const msg = draft1.error.message || "";
    if (/relation .*products.* does not exist|schema cache|Could not find the table|PGRST205/i.test(msg)) {
      fatal(
        "products table not found. Apply migration 006 (and 007) to the live database first, then re-run."
      );
    }
    fatal(`supplier1 draft insert failed unexpectedly: ${msg}`);
  }
  check("Supplier can create a draft product", !!draft1.data && draft1.data.status === "draft");
  const p1 = draft1.data.id;

  await assertCannotSelfPromote("Supplier", supplier1.userId);

  const submitIncomplete = await supabase.rpc("submit_product_for_review", { product_id: p1 });
  check("Incomplete supplier is BLOCKED from submitting", !!submitIncomplete.error, submitIncomplete.error?.message);

  const selfPublishDraft = await supabase
    .from("products")
    .update({ status: "published" })
    .eq("id", p1)
    .select("*");
  check(
    "Supplier CANNOT self-publish a draft (RLS with_check)",
    !!selfPublishDraft.error || (selfPublishDraft.data?.length ?? 0) === 0
  );

  await supabase
    .from("companies")
    .update({ onboarding_completed: true, onboarding_step: "completed" })
    .eq("user_id", supplier1.userId);

  const submitOk = await supabase.rpc("submit_product_for_review", { product_id: p1 });
  check(
    "Completed supplier can submit -> pending",
    !submitOk.error && submitOk.data?.status === "pending",
    submitOk.error?.message
  );

  const editPending = await supabase
    .from("products")
    .update({ name: "Hacked Pending" })
    .eq("id", p1)
    .select("*");
  check("Supplier CANNOT edit a pending product", (editPending.data?.length ?? 0) === 0, editPending.data);

  const selfApprove = await supabase.rpc("approve_product", { product_id: p1 });
  check("Supplier CANNOT self-approve (not admin)", !!selfApprove.error, selfApprove.error?.message);

  const draft2 = await createDraft(supplier1.companyId, supplier1.userId, "Reject Flow");
  const p2 = draft2.data.id;
  await supabase.rpc("submit_product_for_review", { product_id: p2 });
  const draft3 = await createDraft(supplier1.companyId, supplier1.userId, "Archive Flow");
  const p3 = draft3.data.id;

  // ---- buyer restrictions + self-promotion guard -------------------------
  const buyer = await signUp("b1", "buyer");
  const buyerInsert = await supabase
    .from("products")
    .insert({ company_id: buyer.companyId, name: "Buyer Product", category: "Rice", status: "draft" })
    .select("*");
  check("Buyer CANNOT create products", !!buyerInsert.error, buyerInsert.error?.message);

  await assertCannotSelfPromote("Buyer", buyer.userId);

  const buyerApprove = await supabase.rpc("approve_product", { product_id: p1 });
  check("Buyer CANNOT approve products", !!buyerApprove.error, buyerApprove.error?.message);
  const buyerReject = await supabase.rpc("reject_product", { product_id: p2, reason: "x" });
  check("Buyer CANNOT reject products", !!buyerReject.error, buyerReject.error?.message);

  // ---- cross-supplier isolation ------------------------------------------
  const supplier2 = await signUp("s2", "supplier");
  const readOther = await supabase.from("products").select("*").eq("id", p1).maybeSingle();
  check(
    "Supplier CANNOT read another supplier's non-published product",
    !readOther.error && readOther.data === null
  );
  const updateOther = await supabase
    .from("products")
    .update({ name: "Cross Tenant" })
    .eq("id", p1)
    .select("*");
  check("Supplier CANNOT modify another supplier's product", (updateOther.data?.length ?? 0) === 0);

  // ---- admin moderation (trusted provisioning only) ----------------------
  let adminApproved = false;
  if (adminAvailable) {
    const adminEmail = `prod-admin-${stamp}@tradegrid.test`;
    const created = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (created.error) fatal(`admin provisioning failed: ${created.error.message}`);
    const adminId = created.data.user.id;
    // Trusted (service-role) write: bypasses the anon/authenticated trigger.
    const promoteAdmin = await serviceClient
      .from("profiles")
      .upsert({ id: adminId, email: adminEmail, role: "admin" }, { onConflict: "id" });
    if (promoteAdmin.error) fatal(`admin role assignment failed: ${promoteAdmin.error.message}`);

    await signIn(adminEmail);
    const { data: adminIsAdmin } = await supabase.rpc("is_admin");
    check("Legitimate admin is_admin() = true", adminIsAdmin === true);

    const approve = await supabase.rpc("approve_product", { product_id: p1 });
    check(
      "Admin can approve pending -> published",
      !approve.error && approve.data?.status === "published",
      approve.error?.message
    );
    const reject = await supabase.rpc("reject_product", { product_id: p2, reason: "Missing certifications" });
    check(
      "Admin can reject pending -> rejected (with reason)",
      !reject.error && reject.data?.status === "rejected" && reject.data?.rejection_reason === "Missing certifications",
      reject.error?.message
    );
    adminApproved = !approve.error && approve.data?.status === "published";
  } else {
    skip("Positive admin tests (approve/reject, admin is_admin()=true) - require SUPABASE_SERVICE_ROLE_KEY for trusted admin provisioning");
  }

  // ---- public visibility (anon) ------------------------------------------
  await supabase.auth.signOut();
  if (adminApproved) {
    const pubPublished = await supabase.from("products").select("*").eq("id", p1).maybeSingle();
    check("Public CAN read a published product", !pubPublished.error && pubPublished.data?.id === p1);
  } else {
    const pubPending = await supabase.from("products").select("*").eq("id", p1).maybeSingle();
    check("Public CANNOT read a pending product", !pubPending.error && pubPending.data === null);
  }
  const pubP2 = await supabase.from("products").select("*").eq("id", p2).maybeSingle();
  check("Public CANNOT read a non-published product (p2)", !pubP2.error && pubP2.data === null);
  const pubDraft = await supabase.from("products").select("*").eq("id", p3).maybeSingle();
  check("Public CANNOT read a draft product", !pubDraft.error && pubDraft.data === null);
  const pubList = await supabase.from("products").select("id,status");
  check(
    "Public list contains ONLY published products",
    !pubList.error && (pubList.data ?? []).every((r) => r.status === "published")
  );

  // ---- rejected -> editable -> resubmit; archive -------------------------
  await signIn(supplier1.email);
  if (adminApproved) {
    const editRejected = await supabase
      .from("products")
      .update({ description: "Now with certifications" })
      .eq("id", p2)
      .select("*");
    check("Supplier CAN edit a rejected product", !editRejected.error && (editRejected.data?.length ?? 0) === 1);
    const resubmit = await supabase.rpc("submit_product_for_review", { product_id: p2 });
    check(
      "Supplier can resubmit a corrected rejected product -> pending",
      !resubmit.error && resubmit.data?.status === "pending",
      resubmit.error?.message
    );
    const archivePublished = await supabase.rpc("archive_product", { product_id: p1 });
    check(
      "Supplier can archive a published product",
      !archivePublished.error && archivePublished.data?.status === "archived",
      archivePublished.error?.message
    );
  } else {
    skip("Rejected-edit / resubmit / archive-published - depend on admin moderation");
  }
  const archiveDraft = await supabase.rpc("archive_product", { product_id: p3 });
  check(
    "Supplier can archive a draft product",
    !archiveDraft.error && archiveDraft.data?.status === "archived",
    archiveDraft.error?.message
  );

  console.log(`\n${passed} checks passed, ${failures.length} failed, ${skipped} skipped.`);
  if (!adminAvailable) {
    console.log(
      "\nNOTE: SUPABASE_SERVICE_ROLE_KEY was not set. The positive admin path was NOT verified.\n" +
        "Provision a real admin via a trusted mechanism (service key or Supabase SQL Editor:\n" +
        "  update public.profiles set role = 'admin' where id = '<user-uuid>';) and re-run with the\n" +
        "service key present to verify admin approve/reject end-to-end."
    );
  }
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(f);
    process.exit(1);
  }
  console.log("\nAll executed product-system checks passed.");
} catch (error) {
  console.error("\nProduct system verification crashed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
