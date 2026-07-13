// Product Lifecycle UX verification (archive hardening + restore + reopen).
//
// Verifies migration 010 against the LIVE database:
//   1. Supplier owner can archive an allowed-status product
//   2. Buyer cannot archive
//   3. Non-owner supplier cannot archive
//   4. Pending cannot be archived
//   5. Owner can restore archived -> draft
//   6. Buyer cannot restore
//   7. Non-owner cannot restore
//   8. Restore never returns directly to published
//   9. Published owner can reopen -> draft (requires admin/service path)
//  10. Non-owner cannot reopen
//  11. Buyer cannot reopen
//  12. Pending cannot be reopened
//  13. Reopened product is no longer publicly visible
//  14. Supplier still cannot self-publish
//
// If migration 010 is NOT applied, STOPS with manual apply instructions.
//
// Run: node --use-system-ca scripts/verify-product-lifecycle.mjs

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
  const email = `life-${role}-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;
  await supabase
    .from("profiles")
    .upsert({ id: userId, email, role }, { onConflict: "id" });
  await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Co`,
      account_type: role,
      onboarding_completed: role === "supplier",
      onboarding_step: role === "supplier" ? "completed" : "business_info",
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

async function createDraft(companyId, userId, name) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: companyId,
      created_by: userId,
      name,
      category: "Rice",
      status: "draft",
    })
    .select("*")
    .single();
  if (error) fatal(`create draft failed: ${error.message}`);
  return data;
}

async function provisionAdmin() {
  if (!serviceClient) return null;
  const adminEmail = `life-admin-${stamp}@tradegrid.test`;
  const created = await serviceClient.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  if (created.error) fatal(`admin provisioning failed: ${created.error.message}`);
  const adminId = created.data.user.id;
  const promote = await serviceClient
    .from("profiles")
    .upsert({ id: adminId, email: adminEmail, role: "admin" }, { onConflict: "id" });
  if (promote.error) fatal(`admin role assignment failed: ${promote.error.message}`);
  return adminEmail;
}

try {
  const restoreProbe = await supabase.rpc("restore_archived_product", {
    product_id: "00000000-0000-0000-0000-000000000000",
  });

  if (restoreProbe.error) {
    const msg = restoreProbe.error.message || "";
    if (
      /function.*does not exist|schema cache|Could not find|PGRST202/i.test(msg)
    ) {
      console.error(
        "\nMigration 010 is NOT applied yet (restore_archived_product missing).\n" +
          "Apply manually in Supabase SQL Editor:\n" +
          "  1. Open Supabase Dashboard → SQL Editor\n" +
          "  2. Paste contents of supabase/migrations/010_product_lifecycle_restore_reopen.sql\n" +
          "  3. Run the script\n" +
          "  4. Re-run: node --use-system-ca scripts/verify-product-lifecycle.mjs\n"
      );
      process.exit(2);
    }
  }

  check("Migration 010 lifecycle RPCs are callable", true);

  const supplierA = await signUp("owner", "supplier");
  const supplierB = await signUp("other", "supplier");
  const buyer = await signUp("buyer", "buyer");

  await signIn(supplierA.email);
  const draft = await createDraft(
    supplierA.companyId,
    supplierA.userId,
    `Lifecycle Draft ${stamp}`
  );

  // 1) Supplier owner can archive allowed-status product
  const archiveDraft = await supabase.rpc("archive_product", {
    product_id: draft.id,
  });
  check(
    "Supplier owner can archive an allowed-status product",
    !archiveDraft.error && archiveDraft.data?.status === "archived",
    archiveDraft.error?.message
  );

  // 2) Buyer cannot archive
  await signIn(buyer.email);
  const buyerArchive = await supabase.rpc("archive_product", {
    product_id: draft.id,
  });
  check("Buyer cannot archive a product", Boolean(buyerArchive.error));

  // 3) Non-owner supplier cannot archive
  await signIn(supplierB.email);
  const crossArchive = await supabase.rpc("archive_product", {
    product_id: draft.id,
  });
  check(
    "Non-owner supplier cannot archive another supplier's product",
    Boolean(crossArchive.error)
  );

  // 4) Pending cannot be archived
  await signIn(supplierA.email);
  const pendingDraft = await createDraft(
    supplierA.companyId,
    supplierA.userId,
    `Lifecycle Pending ${stamp}`
  );
  const submitPending = await supabase.rpc("submit_product_for_review", {
    product_id: pendingDraft.id,
  });
  if (submitPending.error) fatal(`submit pending failed: ${submitPending.error.message}`);

  const archivePending = await supabase.rpc("archive_product", {
    product_id: pendingDraft.id,
  });
  check("Pending product cannot be archived", Boolean(archivePending.error));

  // 5) Owner can restore archived -> draft
  const restore = await supabase.rpc("restore_archived_product", {
    product_id: draft.id,
  });
  check(
    "Owner can restore archived -> draft",
    !restore.error && restore.data?.status === "draft",
    restore.error?.message
  );

  // 8) Restore never returns directly to published
  check(
    "Restore never returns directly to published",
    restore.data?.status === "draft" && restore.data?.status !== "published"
  );

  // 6) Buyer cannot restore
  await signIn(supplierA.email);
  await supabase.rpc("archive_product", { product_id: draft.id });
  await signIn(buyer.email);
  const buyerRestore = await supabase.rpc("restore_archived_product", {
    product_id: draft.id,
  });
  check("Buyer cannot restore archived product", Boolean(buyerRestore.error));

  // 7) Non-owner cannot restore
  await signIn(supplierB.email);
  const crossRestore = await supabase.rpc("restore_archived_product", {
    product_id: draft.id,
  });
  check(
    "Non-owner supplier cannot restore another supplier's product",
    Boolean(crossRestore.error)
  );

  // 12) Pending cannot be reopened
  await signIn(supplierA.email);
  const reopenPending = await supabase.rpc(
    "reopen_published_product_for_editing",
    { product_id: pendingDraft.id }
  );
  check(
    "Pending product cannot be reopened for editing",
    Boolean(reopenPending.error)
  );

  // 14) Supplier still cannot self-publish
  await supabase.rpc("restore_archived_product", { product_id: draft.id });
  const selfPublish = await supabase
    .from("products")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", draft.id)
    .select("status");
  check(
    "Supplier still cannot self-publish via direct status update",
    Boolean(selfPublish.error)
  );

  // 9–11, 13) Published reopen path (requires trusted admin)
  const adminEmail = await provisionAdmin();
  if (adminEmail) {
    const publishCandidate = await createDraft(
      supplierA.companyId,
      supplierA.userId,
      `Lifecycle Publish ${stamp}`
    );
    await supabase.rpc("submit_product_for_review", {
      product_id: publishCandidate.id,
    });

    await signIn(adminEmail);
    const approve = await supabase.rpc("approve_product", {
      product_id: publishCandidate.id,
    });
    check(
      "Admin can publish product for reopen test setup",
      !approve.error && approve.data?.status === "published",
      approve.error?.message
    );

    const publicBefore = await supabase
      .from("public_products")
      .select("id")
      .eq("id", publishCandidate.id)
      .maybeSingle();
    check(
      "Published product is visible in public_products before reopen",
      Boolean(publicBefore.data)
    );

    await signIn(supplierB.email);
    const crossReopen = await supabase.rpc(
      "reopen_published_product_for_editing",
      { product_id: publishCandidate.id }
    );
    check(
      "Non-owner supplier cannot reopen published product",
      Boolean(crossReopen.error)
    );

    await signIn(buyer.email);
    const buyerReopen = await supabase.rpc(
      "reopen_published_product_for_editing",
      { product_id: publishCandidate.id }
    );
    check("Buyer cannot reopen published product", Boolean(buyerReopen.error));

    await signIn(supplierA.email);
    const ownerReopen = await supabase.rpc(
      "reopen_published_product_for_editing",
      { product_id: publishCandidate.id }
    );
    check(
      "Published owner can reopen -> draft",
      !ownerReopen.error && ownerReopen.data?.status === "draft",
      ownerReopen.error?.message
    );

    const publicAfter = await supabase
      .from("public_products")
      .select("id")
      .eq("id", publishCandidate.id)
      .maybeSingle();
    check(
      "Reopened product is no longer publicly visible",
      !publicAfter.data
    );
  } else {
    skip(
      "Published owner can reopen -> draft - requires SUPABASE_SERVICE_ROLE_KEY for trusted admin"
    );
    skip("Non-owner cannot reopen - depends on published product setup");
    skip("Buyer cannot reopen - depends on published product setup");
    skip(
      "Reopened product public visibility - depends on published reopen path"
    );
  }

  console.log(
    `\nLifecycle verification: ${passed} passed, ${skipped} skipped, ${failures.length} failed`
  );
  if (failures.length > 0) process.exit(1);
} catch (err) {
  fatal(err instanceof Error ? err.message : String(err));
}
