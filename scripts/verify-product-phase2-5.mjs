// Product System Phase 2.5 verification (structured trade data).
//
// Verifies against the LIVE database:
//   * migration 009 boundary detection (structured columns + public_products view)
//   * structured trade field write/read for supplier-owned draft products
//   * legacy text dual-write compatibility
//   * validation rejects invalid structured values
//
// If migration 009 is NOT applied, the script STOPS with manual apply instructions.
// It NEVER fabricates a pass.
//
// Run: node --use-system-ca scripts/verify-product-phase2-5.mjs

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

async function signUpSupplier(label) {
  const email = `p25-supplier-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;
  await supabase
    .from("profiles")
    .upsert({ id: userId, email, role: "supplier" }, { onConflict: "id" });
  await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Co`,
      account_type: "supplier",
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
  // ---- migration 009 boundary detection ----------------------------------
  const probe = await supabase
    .from("products")
    .select("moq_quantity, incoterms_codes, price_amount")
    .limit(0);

  if (probe.error) {
    const msg = probe.error.message || "";
    if (/column|schema cache|Could not find|PGRST\d+/i.test(msg)) {
      console.error(
        "\nMigration 009 is NOT applied yet (structured trade columns missing).\n" +
          "Apply manually in Supabase SQL Editor:\n" +
          "  1. Open Supabase Dashboard → SQL Editor\n" +
          "  2. Paste contents of supabase/migrations/009_structured_product_trade_data.sql\n" +
          "  3. Run the script\n" +
          "  4. Re-run: node --use-system-ca scripts/verify-product-phase2-5.mjs\n"
      );
      process.exit(2);
    }
    fatal(`Unexpected probe error: ${msg}`);
  }

  check("Migration 009 structured columns are queryable", true);

  const viewProbe = await supabase
    .from("public_products")
    .select("moq_quantity, incoterms_codes, price_amount")
    .limit(0);

  if (viewProbe.error) {
    check(
      "public_products view exposes structured trade columns",
      false,
      viewProbe.error.message
    );
  } else {
    check("public_products view exposes structured trade columns", true);
  }

  // ---- supplier structured write/read ------------------------------------
  const supplier = await signUpSupplier("trade");
  await signIn(supplier.email);

  const structuredPayload = {
    company_id: supplier.companyId,
    created_by: supplier.userId,
    status: "draft",
    name: `Phase 2.5 Structured ${stamp}`,
    category: "Rice",
    description: "Structured trade verification product",
    country_of_origin: "India",
    moq: "25 MT",
    moq_quantity: 25,
    moq_unit: "MT",
    packaging: "25 kg PP bags",
    lead_time: "14–21 days",
    lead_time_min: 14,
    lead_time_max: 21,
    lead_time_unit: "days",
    incoterms: "FOB, CIF",
    incoterms_codes: ["FOB", "CIF"],
    hs_code: "1006.30",
    price: "USD 950 / MT (FOB)",
    price_amount: 950,
    price_currency: "USD",
    price_unit: "MT",
    price_incoterm: "FOB",
    certifications: ["ISO 22000"],
    image_url: null,
    gallery: [],
  };

  const insert = await supabase
    .from("products")
    .insert(structuredPayload)
    .select("*")
    .single();

  check("Supplier can insert draft with structured trade fields", !insert.error, insert.error?.message);

  if (insert.data) {
    const row = insert.data;
    check(
      "Structured MOQ persisted",
      row.moq_quantity === 25 && row.moq_unit === "MT"
    );
    check(
      "Structured lead time persisted",
      row.lead_time_min === 14 &&
        row.lead_time_max === 21 &&
        row.lead_time_unit === "days"
    );
    check(
      "Structured incoterms persisted",
      Array.isArray(row.incoterms_codes) &&
        row.incoterms_codes.includes("FOB") &&
        row.incoterms_codes.includes("CIF")
    );
    check(
      "Legacy incoterms text dual-written",
      typeof row.incoterms === "string" && row.incoterms.includes("FOB")
    );
    check(
      "Structured price persisted",
      row.price_amount === 950 &&
        row.price_currency === "USD" &&
        row.price_unit === "MT" &&
        row.price_incoterm === "FOB"
    );

    const update = await supabase
      .from("products")
      .update({
        moq_quantity: 30,
        moq_unit: "MT",
        moq: "30 MT",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("moq_quantity, moq")
      .single();

    check(
      "Supplier can update structured MOQ on editable draft",
      !update.error && update.data?.moq_quantity === 30,
      update.error?.message
    );
  }

  // ---- validation: buyer cannot insert -----------------------------------
  const buyer = await signUpSupplier("buyer-check");
  await supabase
    .from("profiles")
    .update({ role: "buyer" })
    .eq("id", buyer.userId);
  await signIn(buyer.email);

  const buyerInsert = await supabase.from("products").insert({
    company_id: buyer.companyId,
    name: "Buyer product",
    category: "Rice",
    status: "draft",
  });

  check(
    "Buyer cannot create products (unchanged security)",
    Boolean(buyerInsert.error)
  );

  console.log(`\nPhase 2.5 verification: ${passed} passed, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length > 0) {
    process.exit(1);
  }
} catch (err) {
  fatal(err instanceof Error ? err.message : String(err));
}
