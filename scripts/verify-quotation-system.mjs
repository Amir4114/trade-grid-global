// Quotation System verification (migration 015 / Module 2).
//
// Run AFTER applying:
//   supabase/migrations/014_rfq_foundation.sql
//   supabase/migrations/015_quotation_system.sql
//
//   node --use-system-ca scripts/verify-quotation-system.mjs

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

function fatal(message) {
  console.error(`\nFATAL: ${message}`);
  process.exit(1);
}

async function signIn(email) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fatal(`sign in failed for ${email}: ${error.message}`);
}

async function assertMigrationsApplied() {
  const rfqProbe = await supabase.from("rfqs").select("id").limit(1);
  const rfqMsg = rfqProbe.error?.message || "";
  if (/Could not find the table|relation .* does not exist|42P01/i.test(rfqMsg)) {
    console.error("\nMigration 014 missing (rfqs). Apply 014 then 015.\n");
    process.exit(2);
  }

  const qProbe = await supabase.from("quotation_threads").select("id").limit(1);
  const qMsg = qProbe.error?.message || "";
  if (/Could not find the table|relation .* does not exist|42P01/i.test(qMsg)) {
    console.error(
      "\nMigration 015 is NOT applied yet (quotation_threads missing).\n" +
        "Apply supabase/migrations/015_quotation_system.sql then re-run.\n"
    );
    process.exit(2);
  }

  const rpcProbe = await supabase.rpc("submit_quotation", {
    p_rfq_id: "00000000-0000-0000-0000-000000000000",
    p_unit_price: 1,
  });
  const rpcMsg = rpcProbe.error?.message || "";
  if (/function.*does not exist|Could not find the function|PGRST202/i.test(rpcMsg)) {
    console.error("\nMigration 015 RPCs missing (submit_quotation).\n");
    process.exit(2);
  }
}

async function provisionUser(label, role, extras = {}) {
  const email = `quote-${role}-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;
  const writer = serviceClient ?? supabase;

  await writer.from("profiles").upsert(
    { id: userId, email, role },
    { onConflict: "id" }
  );
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} ${role} Co`,
      country: "India",
      account_type: role,
      onboarding_completed: extras.onboarding_completed ?? true,
      onboarding_step: "completed",
      verification_status: extras.verification_status ?? "pending",
    },
    { onConflict: "user_id" }
  );

  const { data: company, error: companyError } = await writer
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (companyError) fatal(`${label} company load failed: ${companyError.message}`);
  return { email, userId, companyId: company.id };
}

async function countNotifications(userId, type, entityId) {
  if (!serviceClient) return null;
  let query = serviceClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("type", type);
  if (entityId) query = query.eq("entity_id", entityId);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

async function createAndPublishRfq(overrides = {}) {
  const { data, error } = await supabase.rpc("create_draft_rfq", {
    p_title: overrides.title ?? `Quote RFQ ${stamp}`,
    p_product_name: "Basmati Rice",
    p_category: "Rice",
    p_visibility: overrides.visibility ?? "public",
    p_invite_supplier_ids: overrides.invite_supplier_ids ?? [],
    p_quote_deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  if (error) fatal(`create_draft_rfq failed: ${error.message}`);
  const published = await supabase.rpc("publish_rfq", { p_rfq_id: data.id });
  if (published.error) fatal(`publish_rfq failed: ${published.error.message}`);
  return published.data;
}

try {
  await assertMigrationsApplied();
  console.log("PASS - Migration 015 quotation schema / submit_quotation reachable");
  passed++;

  const buyer = await provisionUser("owner", "buyer", {
    verification_status: "verified",
  });
  const verifiedSupplier = await provisionUser("verified", "supplier", {
    verification_status: "verified",
  });
  const peerSupplier = await provisionUser("peer", "supplier", {
    verification_status: "verified",
  });
  const pendingSupplier = await provisionUser("pending", "supplier", {
    verification_status: "pending",
  });

  await signIn(buyer.email);
  const publicRfq = await createAndPublishRfq({
    title: `Public quote RFQ ${stamp}`,
    visibility: "public",
  });

  // Supplier submit
  await signIn(verifiedSupplier.email);
  const submitted = await supabase.rpc("submit_quotation", {
    p_rfq_id: publicRfq.id,
    p_currency: "USD",
    p_unit_price: 900,
    p_price_unit: "MT",
    p_incoterm: "FOB",
    p_lead_time_min: 14,
    p_lead_time_max: 21,
    p_notes: "First offer",
  });
  check(
    "Verified supplier can submit_quotation on public RFQ",
    submitted.data?.status === "submitted" && !submitted.error,
    submitted.error
  );

  const threadId = submitted.data?.thread_id;

  const submittedNotif = await countNotifications(
    buyer.userId,
    "quotation.submitted",
    threadId
  );
  if (submittedNotif == null) skip("quotation.submitted notification", "no service role");
  else check("Buyer receives quotation.submitted", submittedNotif >= 1, { submittedNotif });

  // RFQ becomes quoted
  await signIn(buyer.email);
  const rfqAfter = await supabase.from("rfqs").select("status").eq("id", publicRfq.id).single();
  check("RFQ status becomes quoted after first submit", rfqAfter.data?.status === "quoted", rfqAfter);

  // Buyer sees thread; peer supplier does not
  const buyerThreads = await supabase
    .from("quotation_threads")
    .select("id")
    .eq("id", threadId);
  check("Buyer can read quotation thread for own RFQ", (buyerThreads.data?.length ?? 0) === 1);

  await signIn(peerSupplier.email);
  const peerThreads = await supabase
    .from("quotation_threads")
    .select("id")
    .eq("id", threadId);
  check(
    "Peer supplier cannot read another supplier thread",
    (peerThreads.data?.length ?? 0) === 0,
    peerThreads
  );

  const peerOffers = await supabase
    .from("quotation_offers")
    .select("id")
    .eq("thread_id", threadId);
  check(
    "Peer supplier cannot read another supplier offers",
    (peerOffers.data?.length ?? 0) === 0,
    peerOffers
  );

  // Revision history
  await signIn(verifiedSupplier.email);
  const revised = await supabase.rpc("create_quotation_revision", {
    p_thread_id: threadId,
    p_unit_price: 875,
    p_currency: "USD",
    p_price_unit: "MT",
    p_incoterm: "CIF",
    p_notes: "Revised offer",
  });
  check(
    "Supplier can create_quotation_revision",
    revised.data?.status === "submitted" && revised.data?.revision_no === 2,
    revised.error
  );

  const updatedNotif = await countNotifications(
    buyer.userId,
    "quotation.updated",
    threadId
  );
  if (updatedNotif == null) skip("quotation.updated notification", "no service role");
  else check("Buyer receives quotation.updated", updatedNotif >= 1, { updatedNotif });

  const offers = await supabase
    .from("quotation_offers")
    .select("revision_no, status")
    .eq("thread_id", threadId)
    .order("revision_no");
  const superseded = (offers.data ?? []).find((o) => o.revision_no === 1);
  check(
    "Prior offer becomes superseded",
    superseded?.status === "superseded",
    offers.data
  );

  // Draft flow
  await signIn(buyer.email);
  const draftRfq = await createAndPublishRfq({
    title: `Draft flow RFQ ${stamp}`,
    visibility: "public",
  });
  await signIn(peerSupplier.email);
  const draftOffer = await supabase.rpc("create_draft_quotation", {
    p_rfq_id: draftRfq.id,
    p_unit_price: 100,
    p_currency: "USD",
  });
  check("Supplier can create_draft_quotation", draftOffer.data?.status === "draft", draftOffer.error);

  await signIn(buyer.email);
  const buyerSeesDraft = await supabase
    .from("quotation_offers")
    .select("id")
    .eq("id", draftOffer.data.id);
  check(
    "Buyer cannot see supplier draft offers",
    (buyerSeesDraft.data?.length ?? 0) === 0,
    buyerSeesDraft
  );

  await signIn(peerSupplier.email);
  const updatedDraft = await supabase.rpc("update_draft_quotation", {
    p_offer_id: draftOffer.data.id,
    p_unit_price: 110,
    p_notes: "Updated draft",
  });
  check(
    "Supplier can update_draft_quotation",
    updatedDraft.data?.unit_price == 110,
    updatedDraft.error
  );

  const submitDraft = await supabase.rpc("submit_quotation", {
    p_offer_id: draftOffer.data.id,
    p_unit_price: 110,
  });
  check(
    "Supplier can submit draft via submit_quotation(p_offer_id)",
    submitDraft.data?.status === "submitted",
    submitDraft.error
  );

  // Withdraw
  const withdrawn = await supabase.rpc("withdraw_quotation", {
    p_thread_id: submitDraft.data.thread_id,
  });
  check(
    "Supplier can withdraw_quotation",
    withdrawn.data?.status === "withdrawn",
    withdrawn.error
  );

  const withdrawnNotif = await countNotifications(
    buyer.userId,
    "quotation.withdrawn",
    submitDraft.data.thread_id
  );
  if (withdrawnNotif == null) skip("quotation.withdrawn notification", "no service role");
  else check("Buyer receives quotation.withdrawn", withdrawnNotif >= 1, { withdrawnNotif });

  // Closed RFQ rejection
  await signIn(buyer.email);
  const closeTarget = await createAndPublishRfq({
    title: `Close quote RFQ ${stamp}`,
    visibility: "public",
  });
  await supabase.rpc("close_rfq", { p_rfq_id: closeTarget.id });
  await signIn(verifiedSupplier.email);
  const quoteClosed = await supabase.rpc("submit_quotation", {
    p_rfq_id: closeTarget.id,
    p_unit_price: 1,
  });
  check(
    "Cannot submit_quotation on closed RFQ",
    !!quoteClosed.error,
    quoteClosed.error?.message
  );

  // Invite-only enforcement
  await signIn(buyer.email);
  const inviteRfq = await createAndPublishRfq({
    title: `Invite quote RFQ ${stamp}`,
    visibility: "invite_only",
    invite_supplier_ids: [verifiedSupplier.companyId],
  });
  await signIn(peerSupplier.email);
  const outsiderQuote = await supabase.rpc("submit_quotation", {
    p_rfq_id: inviteRfq.id,
    p_unit_price: 50,
  });
  check(
    "Non-invited supplier cannot quote invite_only RFQ",
    !!outsiderQuote.error,
    outsiderQuote.error?.message
  );
  await signIn(verifiedSupplier.email);
  const invitedQuote = await supabase.rpc("submit_quotation", {
    p_rfq_id: inviteRfq.id,
    p_unit_price: 55,
  });
  check(
    "Invited supplier can quote invite_only RFQ",
    invitedQuote.data?.status === "submitted",
    invitedQuote.error
  );

  // Verified-only enforcement
  await signIn(buyer.email);
  const verifiedOnlyRfq = await createAndPublishRfq({
    title: `Verified only quote RFQ ${stamp}`,
    visibility: "verified_suppliers_only",
  });
  await signIn(pendingSupplier.email);
  const pendingQuote = await supabase.rpc("submit_quotation", {
    p_rfq_id: verifiedOnlyRfq.id,
    p_unit_price: 40,
  });
  check(
    "Pending supplier cannot quote verified_suppliers_only RFQ",
    !!pendingQuote.error,
    pendingQuote.error?.message
  );
  await signIn(verifiedSupplier.email);
  const verifiedQuote = await supabase.rpc("submit_quotation", {
    p_rfq_id: verifiedOnlyRfq.id,
    p_unit_price: 42,
  });
  check(
    "Verified supplier can quote verified_suppliers_only RFQ",
    verifiedQuote.data?.status === "submitted",
    verifiedQuote.error
  );

  // Buyer cannot submit quotation
  await signIn(buyer.email);
  const buyerSubmit = await supabase.rpc("submit_quotation", {
    p_rfq_id: publicRfq.id,
    p_unit_price: 1,
  });
  check("Buyer cannot submit_quotation", !!buyerSubmit.error, buyerSubmit.error?.message);

  // get_quotation_thread access
  await signIn(verifiedSupplier.email);
  const ownView = await supabase.rpc("get_quotation_thread", {
    p_thread_id: threadId,
  });
  check("Owner supplier can get_quotation_thread", !!ownView.data && !ownView.error, ownView.error);

  await signIn(peerSupplier.email);
  const peerView = await supabase.rpc("get_quotation_thread", {
    p_thread_id: threadId,
  });
  check(
    "Peer supplier denied get_quotation_thread",
    !!peerView.error,
    peerView.error?.message
  );

  await signIn(buyer.email);
  const buyerView = await supabase.rpc("get_quotation_thread", {
    p_thread_id: threadId,
  });
  check("Buyer can get_quotation_thread for own RFQ", !!buyerView.data && !buyerView.error, buyerView.error);

  // Direct insert denied
  await signIn(verifiedSupplier.email);
  const directInsert = await supabase.from("quotation_threads").insert({
    rfq_id: publicRfq.id,
    supplier_company_id: verifiedSupplier.companyId,
    status: "active",
  });
  check("Direct INSERT into quotation_threads denied", !!directInsert.error);

  console.log(
    `\nDone. passed=${passed} failed=${failures.length} skipped=${skipped}`
  );
  if (failures.length > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
} catch (err) {
  console.error("FATAL:", err);
  process.exit(1);
}
