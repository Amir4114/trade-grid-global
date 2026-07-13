// Product System Phase 2 verification (media storage + public supplier views).
//
// Verifies, against the LIVE database with the anon key, the security model
// introduced by migration 008:
//   * product-images storage RLS (supplier-own writes only; buyers/anon denied;
//     cross-supplier writes/deletes denied)
//   * public_products / public_suppliers views expose ONLY safe columns and
//     ONLY published rows.
//
// This script CANNOT provision an admin (no service-role key) and therefore
// cannot publish a product; publish-dependent assertions are reported as
// manual. It NEVER fabricates a pass.
//
// If migration 008 is not applied yet, the script STOPS and prints the exact
// manual apply step instead of pretending the tests ran.
//
// Run: node --use-system-ca scripts/verify-product-phase2.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey);

const BUCKET = "product-images";
const stamp = Date.now();
const password = "TestPass123!";
let passed = 0;
let skipped = 0;
const failures = [];

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

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
  const email = `p2-${role}-${label}-${stamp}@tradegrid.test`;
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

try {
  // ---- migration boundary detection --------------------------------------
  const probe = await supabase.from("public_products").select("id").limit(1);
  if (probe.error) {
    const msg = probe.error.message || "";
    if (/does not exist|schema cache|Could not find the table|PGRST205|relation/i.test(msg)) {
      console.error(
        "\nMigration 008 is NOT applied yet (public_products view missing).\n" +
          "\nAPPLY THIS FIRST (Supabase Dashboard -> SQL Editor):\n" +
          "  supabase/migrations/008_product_media_and_public_supplier.sql\n" +
          "\nThen re-run:  node --use-system-ca scripts/verify-product-phase2.mjs\n"
      );
      process.exit(1);
    }
    fatal(`unexpected error probing public_products: ${msg}`);
  }
  check("public_products view is reachable (migration 008 applied)", !probe.error);

  const suppliersProbe = await supabase.from("public_suppliers").select("company_id").limit(1);
  check("public_suppliers view is reachable", !suppliersProbe.error, suppliersProbe.error?.message);

  // ---- view column exposure (no private leakage) -------------------------
  const leakUserId = await supabase.from("public_products").select("user_id").limit(1);
  check("public_products does NOT expose user_id", !!leakUserId.error, leakUserId.error?.message);
  const leakRisk = await supabase.from("public_products").select("risk_score").limit(1);
  check("public_products does NOT expose risk_score", !!leakRisk.error, leakRisk.error?.message);
  const leakSupUser = await supabase.from("public_suppliers").select("user_id").limit(1);
  check("public_suppliers does NOT expose user_id", !!leakSupUser.error, leakSupUser.error?.message);

  // ---- provision test users ----------------------------------------------
  const supplier1 = await signUp("s1", "supplier");
  const supplier2 = await signUp("s2", "supplier");
  const buyer = await signUp("b1", "buyer");

  // ---- anon cannot upload -------------------------------------------------
  await supabase.auth.signOut();
  const anonUpload = await supabase.storage
    .from(BUCKET)
    .upload(`${supplier1.companyId}/anon-${stamp}.png`, PNG, { contentType: "image/png" });
  check("Anonymous user CANNOT upload product images", !!anonUpload.error, anonUpload.error?.message);

  // ---- buyer cannot upload ------------------------------------------------
  await signIn(buyer.email);
  const buyerUpload = await supabase.storage
    .from(BUCKET)
    .upload(`${buyer.companyId}/buyer-${stamp}.png`, PNG, { contentType: "image/png" });
  check("Buyer CANNOT upload product images", !!buyerUpload.error, buyerUpload.error?.message);

  // ---- supplier can upload into OWN company folder ------------------------
  await signIn(supplier1.email);
  const ownName = `own-${stamp}.png`;
  const ownPath = `${supplier1.companyId}/${ownName}`;
  const ownUpload = await supabase.storage
    .from(BUCKET)
    .upload(ownPath, PNG, { contentType: "image/png" });
  check("Supplier CAN upload into own company folder", !ownUpload.error, ownUpload.error?.message);

  // ---- supplier CANNOT upload into another company's folder --------------
  const crossUpload = await supabase.storage
    .from(BUCKET)
    .upload(`${supplier2.companyId}/cross-${stamp}.png`, PNG, { contentType: "image/png" });
  check(
    "Supplier CANNOT upload into another supplier's folder",
    !!crossUpload.error,
    crossUpload.error?.message
  );

  // ---- supplier CANNOT delete another supplier's image -------------------
  if (!ownUpload.error) {
    await signIn(supplier2.email);
    await supabase.storage.from(BUCKET).remove([ownPath]);
    // Re-check as owner: the object must still exist.
    await signIn(supplier1.email);
    const list = await supabase.storage.from(BUCKET).list(supplier1.companyId);
    const stillThere = (list.data ?? []).some((o) => o.name === ownName);
    check("Supplier CANNOT delete another supplier's image", stillThere, {
      listError: list.error?.message,
    });
    // Best-effort cleanup of our own test object.
    await supabase.storage.from(BUCKET).remove([ownPath]);
  } else {
    skip("Cross-supplier delete isolation (own upload did not succeed)");
  }

  // ---- unpublished products are not in the public view -------------------
  await signIn(supplier1.email);
  const draft = await supabase
    .from("products")
    .insert({
      company_id: supplier1.companyId,
      created_by: supplier1.userId,
      name: `P2 Draft ${stamp}`,
      category: "Rice",
      status: "draft",
    })
    .select("id")
    .single();
  if (!draft.error) {
    await supabase.auth.signOut();
    const inView = await supabase
      .from("public_products")
      .select("id")
      .eq("id", draft.data.id)
      .maybeSingle();
    check(
      "Draft product is NOT visible in public_products",
      !inView.error && inView.data === null,
      inView.error?.message
    );
  } else {
    skip("Draft-not-in-view (draft insert failed)");
  }

  skip("Published product appears in public_products with supplier identity - requires admin publish (service-role/manual)");

  console.log(`\n${passed} checks passed, ${failures.length} failed, ${skipped} skipped.`);
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(f);
    process.exit(1);
  }
  console.log("\nAll executed Phase 2 checks passed.");
  console.log(
    "NOTE: publish-dependent assertions require a trusted admin (service-role key) and are covered by the manual browser checklist."
  );
} catch (error) {
  console.error("\nPhase 2 verification crashed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
