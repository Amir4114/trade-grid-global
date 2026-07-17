// Purchase Order System verification (migration 017 / Module 3.1).
//
// Run AFTER applying:
//   supabase/migrations/014_rfq_foundation.sql
//   supabase/migrations/015_quotation_system.sql
//   supabase/migrations/016_award_system.sql
//   supabase/migrations/017_purchase_order_system.sql
//
//   node --use-system-ca scripts/verify-purchase-order-system.mjs

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
  const poProbe = await supabase.from("purchase_orders").select("id").limit(1);
  const poMsg = poProbe.error?.message || "";
  if (/Could not find the table|relation .* does not exist|42P01/i.test(poMsg)) {
    console.error(
      "\nMigration 017 is NOT applied yet (purchase_orders missing).\n" +
        "Apply supabase/migrations/017_purchase_order_system.sql then re-run.\n"
    );
    process.exit(2);
  }

  const rpcProbe = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: "00000000-0000-0000-0000-000000000000",
  });
  const rpcMsg = rpcProbe.error?.message || "";
  if (/function.*does not exist|Could not find the function|PGRST202/i.test(rpcMsg)) {
    console.error("\nMigration 017 RPCs missing (create_purchase_order_draft).\n");
    process.exit(2);
  }
}

async function provisionUser(label, role, extras = {}) {
  const email = `po-${role}-${label}-${stamp}@tradegrid.test`;
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
      verification_status: extras.verification_status ?? "verified",
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
    p_title: overrides.title ?? `PO RFQ ${stamp}`,
    p_product_name: "Basmati Rice",
    p_category: "Rice",
    p_visibility: overrides.visibility ?? "public",
    p_required_certifications: ["ISO 22000"],
    p_quantity_value: 100,
    p_quantity_unit: "MT",
    p_quote_deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  if (error) fatal(`create_draft_rfq failed: ${error.message}`);
  const published = await supabase.rpc("publish_rfq", { p_rfq_id: data.id });
  if (published.error) fatal(`publish_rfq failed: ${published.error.message}`);
  return published.data;
}

async function submitOffer(rfqId, unitPrice) {
  const { data, error } = await supabase.rpc("submit_quotation", {
    p_rfq_id: rfqId,
    p_currency: "USD",
    p_unit_price: unitPrice,
    p_price_unit: "MT",
    p_moq_quantity: 20,
    p_moq_unit: "MT",
    p_incoterm: "FOB",
    p_lead_time_min: 14,
    p_lead_time_max: 21,
    p_notes: `Offer ${unitPrice}`,
  });
  if (error) fatal(`submit_quotation failed: ${error.message}`);
  return data;
}

try {
  await assertMigrationsApplied();
  console.log("PASS - Migration 017 purchase_orders / create_purchase_order_draft reachable");
  passed++;

  const buyer = await provisionUser("owner", "buyer");
  const outsiderBuyer = await provisionUser("outsider", "buyer");
  const winner = await provisionUser("winner", "supplier");
  const peer = await provisionUser("peer", "supplier");

  const eventsProbe = await supabase.from("purchase_order_events").select("id").limit(1);
  check("purchase_order_events readable under RLS", !eventsProbe.error, eventsProbe.error);

  const itemsProbe = await supabase.from("purchase_order_items").select("id").limit(1);
  check("purchase_order_items readable under RLS", !itemsProbe.error, itemsProbe.error);

  if (serviceClient) {
    const bucket = await serviceClient.storage.getBucket("purchase-order-docs");
    check(
      "purchase-order-docs storage bucket exists (private)",
      !!bucket.data && bucket.data.public === false,
      bucket.error?.message ?? bucket.data
    );
  } else {
    skip("purchase-order-docs bucket probe", "no service role");
  }

  await signIn(buyer.email);
  const rfq = await createAndPublishRfq({ title: `PO flow RFQ ${stamp}` });

  await signIn(winner.email);
  const winnerOffer = await submitOffer(rfq.id, 900);

  await signIn(buyer.email);
  const awarded = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: winnerOffer.thread_id,
    p_notes: "PO path award",
  });
  check(
    "Prerequisite award succeeds",
    awarded.data?.status === "active" && !awarded.error,
    awarded.error
  );
  const awardId = awarded.data?.id;

  // Outsider cannot create PO
  await signIn(outsiderBuyer.email);
  const outsiderDraft = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: awardId,
  });
  check(
    "Outsider buyer cannot create PO on foreign award",
    !!outsiderDraft.error,
    outsiderDraft.error?.message
  );

  // Supplier cannot create PO
  await signIn(winner.email);
  const supplierDraft = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: awardId,
  });
  check("Supplier cannot create_purchase_order_draft", !!supplierDraft.error);

  // Create draft
  await signIn(buyer.email);
  const draft = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: awardId,
    p_payment_terms: "Net 30",
    p_notes: "Ship in food-grade bags",
  });
  check(
    "Buyer create_purchase_order_draft succeeds",
    draft.data?.status === "draft" && !draft.error,
    draft.error
  );
  const poId = draft.data?.id;
  const poNumber = draft.data?.po_number;
  check(
    "PO number uses TGG-PO-YYYY-###### format",
    typeof poNumber === "string" && /^TGG-PO-\d{4}-\d{6}$/.test(poNumber),
    poNumber
  );
  check(
    "Commercial snapshot captured (product, currency, payment terms)",
    draft.data?.product_name === "Basmati Rice" &&
      draft.data?.currency === "USD" &&
      draft.data?.payment_terms === "Net 30" &&
      draft.data?.buyer_company_name &&
      draft.data?.supplier_company_name,
    draft.data
  );

  // Duplicate active PO denied
  const dup = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: awardId,
  });
  check("One active PO per award (duplicate draft denied)", !!dup.error, dup.error?.message);

  // Supplier cannot see draft via RLS
  await signIn(winner.email);
  const supplierDraftSelect = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("id", poId);
  check(
    "Supplier cannot read draft PO (AD-3.1-010)",
    (supplierDraftSelect.data?.length ?? 0) === 0,
    supplierDraftSelect
  );

  await signIn(peer.email);
  const peerSelect = await supabase.from("purchase_orders").select("id").eq("id", poId);
  check(
    "Unrelated supplier cannot read PO (cross-company isolation)",
    (peerSelect.data?.length ?? 0) === 0,
    peerSelect
  );

  // Update draft
  await signIn(buyer.email);
  const updated = await supabase.rpc("update_purchase_order_draft", {
    p_purchase_order_id: poId,
    p_payment_terms: "CAD",
  });
  check(
    "Buyer can update draft (revision increments)",
    updated.data?.payment_terms === "CAD" &&
      updated.data?.revision_no === (draft.data?.revision_no ?? 1) + 1 &&
      !updated.error,
    updated.error
  );

  // Issue
  const issued = await supabase.rpc("issue_purchase_order", {
    p_purchase_order_id: poId,
  });
  check(
    "Buyer issue_purchase_order draft → issued",
    issued.data?.status === "issued" && !issued.error,
    issued.error
  );

  // Commercial lock: update denied after issue
  const updateIssued = await supabase.rpc("update_purchase_order_draft", {
    p_purchase_order_id: poId,
    p_payment_terms: "Should fail",
  });
  check("Commercial update denied after issue", !!updateIssued.error);

  // Supplier can read issued
  await signIn(winner.email);
  const winnerRead = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", poId)
    .single();
  check(
    "Supplier can read issued PO",
    winnerRead.data?.status === "issued" && !winnerRead.error,
    winnerRead.error
  );

  // Buyer cannot accept
  await signIn(buyer.email);
  const buyerAccept = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: poId,
  });
  check("Buyer cannot accept_purchase_order", !!buyerAccept.error);

  // Peer supplier cannot accept
  await signIn(peer.email);
  const peerAccept = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: poId,
  });
  check("Peer supplier cannot accept foreign PO", !!peerAccept.error);

  // Accept
  await signIn(winner.email);
  const accepted = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: poId,
  });
  check(
    "Supplier accept_purchase_order issued → accepted",
    accepted.data?.status === "accepted" && !accepted.error,
    accepted.error
  );

  // Cancel denied after accept
  await signIn(buyer.email);
  const cancelAccepted = await supabase.rpc("cancel_purchase_order", {
    p_purchase_order_id: poId,
  });
  check("Cannot cancel accepted PO", !!cancelAccepted.error);

  // Revoke blocked when accepted PO exists
  const revokeBlocked = await supabase.rpc("revoke_award", {
    p_award_id: awardId,
    p_reason: "Should fail",
  });
  check(
    "revoke_award blocked when accepted PO exists",
    !!revokeBlocked.error,
    revokeBlocked.error?.message
  );

  // Events
  const poEvents = await supabase
    .from("purchase_order_events")
    .select("event_type")
    .eq("purchase_order_id", poId);
  const types = (poEvents.data ?? []).map((e) => e.event_type);
  check(
    "Audit events for create/issue/accept",
    types.includes("purchase_order.created") &&
      types.includes("purchase_order.issued") &&
      types.includes("purchase_order.accepted"),
    types
  );

  // Notifications
  const createdNotif = await countNotifications(buyer.userId, "purchase_order.created", poId);
  if (createdNotif == null) skip("purchase_order.created notification", "no service role");
  else check("Buyer receives purchase_order.created", createdNotif >= 1, { createdNotif });

  const issuedNotif = await countNotifications(winner.userId, "purchase_order.issued", poId);
  if (issuedNotif == null) skip("purchase_order.issued notification", "no service role");
  else check("Supplier receives purchase_order.issued", issuedNotif >= 1, { issuedNotif });

  const acceptedNotif = await countNotifications(buyer.userId, "purchase_order.accepted", poId);
  if (acceptedNotif == null) skip("purchase_order.accepted notification", "no service role");
  else check("Buyer receives purchase_order.accepted", acceptedNotif >= 1, { acceptedNotif });

  // get / list
  await signIn(buyer.email);
  const detail = await supabase.rpc("get_purchase_order", {
    p_purchase_order_id: poId,
  });
  check(
    "get_purchase_order returns aggregate",
    detail.data?.purchase_order?.id === poId &&
      Array.isArray(detail.data?.items) &&
      Array.isArray(detail.data?.events) &&
      !detail.error,
    detail.error
  );

  const listed = await supabase.rpc("list_purchase_orders", {
    p_status: "accepted",
  });
  check(
    "list_purchase_orders filters accepted",
    Array.isArray(listed.data?.rows) &&
      listed.data.rows.some((r) => r.id === poId) &&
      !listed.error,
    listed.error
  );

  // Direct insert denied
  const directInsert = await supabase.from("purchase_orders").insert({
    po_number: `TGG-PO-FAKE-${stamp}`,
    buyer_company_id: buyer.companyId,
    supplier_company_id: winner.companyId,
    award_id: awardId,
    rfq_id: rfq.id,
    thread_id: winnerOffer.thread_id,
    source_offer_id: winnerOffer.id,
    status: "draft",
  });
  check("Direct INSERT into purchase_orders denied", !!directInsert.error);

  // Reject / cancel recovery path on a second RFQ
  await signIn(buyer.email);
  const rfq2 = await createAndPublishRfq({ title: `PO reject RFQ ${stamp}` });
  await signIn(winner.email);
  const offer2 = await submitOffer(rfq2.id, 880);
  await signIn(buyer.email);
  const award2 = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq2.id,
    p_thread_id: offer2.thread_id,
  });
  const draft2 = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: award2.data.id,
  });
  const issued2 = await supabase.rpc("issue_purchase_order", {
    p_purchase_order_id: draft2.data.id,
  });
  check("Second PO issued for reject path", issued2.data?.status === "issued");

  await signIn(winner.email);
  const rejected = await supabase.rpc("reject_purchase_order", {
    p_purchase_order_id: draft2.data.id,
    p_reason: "Cannot meet packaging",
  });
  check(
    "Supplier reject_purchase_order with reason",
    rejected.data?.status === "rejected" && !rejected.error,
    rejected.error
  );

  await signIn(buyer.email);
  const draft3 = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: award2.data.id,
    p_payment_terms: "Revised terms",
  });
  check(
    "New draft allowed after reject (AD-3.1-011)",
    draft3.data?.status === "draft" && !draft3.error,
    draft3.error
  );

  const cancelled = await supabase.rpc("cancel_purchase_order", {
    p_purchase_order_id: draft3.data.id,
    p_reason: "Hold",
  });
  check(
    "Buyer cancel draft PO",
    cancelled.data?.status === "cancelled" && !cancelled.error,
    cancelled.error
  );

  // Issued PO blocks revoke; cancel first then revoke
  await signIn(buyer.email);
  const rfq3 = await createAndPublishRfq({ title: `PO revoke RFQ ${stamp}` });
  await signIn(winner.email);
  const offer3 = await submitOffer(rfq3.id, 870);
  await signIn(buyer.email);
  const award3 = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq3.id,
    p_thread_id: offer3.thread_id,
  });
  const draft4 = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: award3.data.id,
  });
  await supabase.rpc("issue_purchase_order", {
    p_purchase_order_id: draft4.data.id,
  });
  const revokeIssued = await supabase.rpc("revoke_award", {
    p_award_id: award3.data.id,
  });
  check("revoke_award blocked while PO issued", !!revokeIssued.error);

  await supabase.rpc("cancel_purchase_order", {
    p_purchase_order_id: draft4.data.id,
    p_reason: "Before revoke",
  });
  const revokeOk = await supabase.rpc("revoke_award", {
    p_award_id: award3.data.id,
    p_reason: "After PO cancel",
  });
  check(
    "revoke_award allowed after issued PO cancelled",
    revokeOk.data?.status === "revoked" && !revokeOk.error,
    revokeOk.error
  );

  // Draft auto-cancel on revoke
  await signIn(buyer.email);
  const rfq4 = await createAndPublishRfq({ title: `PO draft revoke RFQ ${stamp}` });
  await signIn(winner.email);
  const offer4 = await submitOffer(rfq4.id, 860);
  await signIn(buyer.email);
  const award4 = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq4.id,
    p_thread_id: offer4.thread_id,
  });
  const draft5 = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: award4.data.id,
  });
  const revokeDraft = await supabase.rpc("revoke_award", {
    p_award_id: award4.data.id,
    p_reason: "Cancel with draft",
  });
  check(
    "revoke_award with draft PO succeeds",
    revokeDraft.data?.status === "revoked" && !revokeDraft.error,
    revokeDraft.error
  );
  const draftAfter = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", draft5.data.id)
    .single();
  check(
    "Draft PO auto-cancelled on award revoke",
    draftAfter.data?.status === "cancelled",
    draftAfter
  );

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
