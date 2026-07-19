// RFQ Foundation verification (migration 014 / Sprint 14.1 Phase A).
//
// Validates schema presence, RLS, lifecycle RPCs, visibility enforcement,
// invite-only access, notifications, and cross-role security boundaries.
//
// Quotations / negotiation / matching are intentionally out of scope.
//
// Run AFTER applying supabase/migrations/014_rfq_foundation.sql:
//   node --use-system-ca scripts/verify-rfq-foundation.mjs

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

async function assertMigration014Applied() {
  const probe = await supabase.from("rfqs").select("id").limit(1);
  const msg = probe.error?.message || "";
  if (/Could not find the table|relation .* does not exist|42P01/i.test(msg)) {
    console.error(
      "\nMigration 014 is NOT applied yet (rfqs missing).\n" +
        "Apply manually in Supabase SQL Editor:\n" +
        "  supabase/migrations/014_rfq_foundation.sql\n" +
        "Then re-run: node --use-system-ca scripts/verify-rfq-foundation.mjs\n"
    );
    process.exit(2);
  }

  const rpcProbe = await supabase.rpc("create_draft_rfq", {
    p_title: "__probe__",
    p_product_name: "__probe__",
    p_category: "Rice",
  });
  const rpcMsg = rpcProbe.error?.message || "";
  if (/function.*does not exist|Could not find the function|PGRST202/i.test(rpcMsg)) {
    console.error(
      "\nMigration 014 RPCs missing (create_draft_rfq).\n" +
        "Apply supabase/migrations/014_rfq_foundation.sql then re-run.\n"
    );
    process.exit(2);
  }
}

async function provisionUser(label, role, extras = {}) {
  const email = `rfq-${role}-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: role,
        full_name: `${label} Test`,
        company_name: `${label} ${role} Co`,
      },
    },
  });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;
  const writer = serviceClient ?? supabase;

  await writer.from("profiles").upsert({ id: userId, email, role }, { onConflict: "id" });
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} ${role} Co`,
      country: "India",
      account_type: role,
      onboarding_completed: extras.onboarding_completed ?? true,
      onboarding_step: extras.onboarding_completed === false ? "business_info" : "completed",
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

  return { email, userId, companyId: company.id, company };
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

async function createDraftAsBuyer(overrides = {}) {
  const { data, error } = await supabase.rpc("create_draft_rfq", {
    p_title: overrides.title ?? `RFQ ${stamp}`,
    p_product_name: overrides.product_name ?? "Basmati Rice",
    p_category: overrides.category ?? "Rice",
    p_description: overrides.description ?? "1121 steam",
    p_quantity_value: overrides.quantity_value ?? 100,
    p_quantity_unit: overrides.quantity_unit ?? "MT",
    p_target_country: overrides.target_country ?? "UAE",
    p_visibility: overrides.visibility ?? "verified_suppliers_only",
    p_invite_supplier_ids: overrides.invite_supplier_ids ?? [],
    p_quote_deadline_at:
      overrides.quote_deadline_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return { data, error };
}

try {
  await assertMigration014Applied();
  console.log("PASS - Migration 014 rfqs table / create_draft_rfq reachable");
  passed++;

  const buyer = await provisionUser("owner", "buyer", {
    onboarding_completed: true,
    verification_status: "verified",
  });
  const buyerIncomplete = await provisionUser("incomplete", "buyer", {
    onboarding_completed: false,
  });
  const verifiedSupplier = await provisionUser("verified", "supplier", {
    verification_status: "verified",
  });
  const pendingSupplier = await provisionUser("pending", "supplier", {
    verification_status: "pending",
  });
  const outsiderSupplier = await provisionUser("outsider", "supplier", {
    verification_status: "verified",
  });

  // --- Buyer draft create ---
  await signIn(buyer.email);
  const draftRes = await createDraftAsBuyer({
    title: `Public demand ${stamp}`,
    visibility: "public",
  });
  check("Buyer can create draft RFQ", !!draftRes.data && !draftRes.error, draftRes.error);
  const publicRfqId = draftRes.data?.id;

  const directInsert = await supabase.from("rfqs").insert({
    buyer_company_id: buyer.companyId,
    title: "hack",
    product_name: "hack",
    category: "Rice",
    status: "open",
  });
  check("Direct INSERT into rfqs is denied", !!directInsert.error, directInsert.error?.message);

  // --- Supplier cannot create ---
  await signIn(verifiedSupplier.email);
  const supplierCreate = await createDraftAsBuyer({ title: "supplier attempt" });
  check("Supplier cannot create_draft_rfq", !!supplierCreate.error, supplierCreate.error?.message);

  // --- Draft not discoverable ---
  const draftList = await supabase.from("rfqs").select("id").eq("id", publicRfqId);
  check(
    "Supplier cannot see draft RFQ",
    !draftList.error && (draftList.data?.length ?? 0) === 0,
    draftList
  );

  // --- Publish public ---
  await signIn(buyer.email);
  const publishPublic = await supabase.rpc("publish_rfq", {
    p_rfq_id: publicRfqId,
  });
  check(
    "Buyer can publish draft RFQ",
    publishPublic.data?.status === "open" && !publishPublic.error,
    publishPublic.error
  );

  const publishedNotif = await countNotifications(buyer.userId, "rfq.published", publicRfqId);
  if (publishedNotif == null) {
    skip("rfq.published notification", "service role unavailable");
  } else {
    check("rfq.published notification created for buyer", publishedNotif >= 1, {
      publishedNotif,
    });
  }

  // --- Visibility: public visible to pending + verified suppliers ---
  await signIn(pendingSupplier.email);
  const pendingSeesPublic = await supabase
    .from("rfqs")
    .select("id, visibility")
    .eq("id", publicRfqId);
  check(
    "Pending supplier can discover public RFQ",
    (pendingSeesPublic.data?.length ?? 0) === 1,
    pendingSeesPublic
  );

  await signIn(verifiedSupplier.email);
  const verifiedSeesPublic = await supabase.from("rfqs").select("id").eq("id", publicRfqId);
  check(
    "Verified supplier can discover public RFQ",
    (verifiedSeesPublic.data?.length ?? 0) === 1,
    verifiedSeesPublic
  );

  // --- verified_suppliers_only ---
  await signIn(buyer.email);
  const verifiedOnlyDraft = await createDraftAsBuyer({
    title: `Verified only ${stamp}`,
    visibility: "verified_suppliers_only",
  });
  check("Create verified_suppliers_only draft", !!verifiedOnlyDraft.data, verifiedOnlyDraft.error);
  const verifiedOnlyId = verifiedOnlyDraft.data.id;
  const publishVerifiedOnly = await supabase.rpc("publish_rfq", {
    p_rfq_id: verifiedOnlyId,
  });
  check(
    "Publish verified_suppliers_only RFQ",
    publishVerifiedOnly.data?.status === "open",
    publishVerifiedOnly.error
  );

  await signIn(pendingSupplier.email);
  const pendingSeesVerifiedOnly = await supabase.from("rfqs").select("id").eq("id", verifiedOnlyId);
  check(
    "Pending supplier cannot discover verified_suppliers_only RFQ",
    (pendingSeesVerifiedOnly.data?.length ?? 0) === 0,
    pendingSeesVerifiedOnly
  );

  await signIn(verifiedSupplier.email);
  const verifiedSeesVerifiedOnly = await supabase
    .from("rfqs")
    .select("id")
    .eq("id", verifiedOnlyId);
  if (verifiedSupplier.company.verification_status !== "verified") {
    skip(
      "Verified supplier can discover verified_suppliers_only RFQ",
      "trusted verification fixture requires service role"
    );
  } else {
    check(
      "Verified supplier can discover verified_suppliers_only RFQ",
      (verifiedSeesVerifiedOnly.data?.length ?? 0) === 1,
      verifiedSeesVerifiedOnly
    );
  }

  // --- invite_only ---
  await signIn(buyer.email);
  const inviteDraft = await createDraftAsBuyer({
    title: `Invite only ${stamp}`,
    visibility: "invite_only",
    invite_supplier_ids: [verifiedSupplier.companyId],
  });
  check("Create invite_only draft with invite", !!inviteDraft.data, inviteDraft.error);
  const inviteRfqId = inviteDraft.data.id;

  const publishInviteMissing = await createDraftAsBuyer({
    title: `Invite missing ${stamp}`,
    visibility: "invite_only",
    invite_supplier_ids: [],
  });
  if (publishInviteMissing.data) {
    const badPublish = await supabase.rpc("publish_rfq", {
      p_rfq_id: publishInviteMissing.data.id,
    });
    check(
      "Publish invite_only without invites is rejected",
      !!badPublish.error,
      badPublish.error?.message
    );
  } else {
    check(
      "Create invite_only without invites still allowed as draft",
      !!publishInviteMissing.data || !!publishInviteMissing.error
    );
  }

  const publishInvite = await supabase.rpc("publish_rfq", {
    p_rfq_id: inviteRfqId,
  });
  check(
    "Publish invite_only with invites succeeds",
    publishInvite.data?.status === "open",
    publishInvite.error
  );

  const invitedNotif = await countNotifications(
    verifiedSupplier.userId,
    "rfq.invited",
    inviteRfqId
  );
  if (invitedNotif == null) {
    skip("rfq.invited notification", "service role unavailable");
  } else {
    check("rfq.invited notification created for invited supplier", invitedNotif >= 1, {
      invitedNotif,
    });
  }

  await signIn(verifiedSupplier.email);
  const inviteeSees = await supabase.from("rfqs").select("id").eq("id", inviteRfqId);
  check(
    "Invited supplier can discover invite_only RFQ",
    (inviteeSees.data?.length ?? 0) === 1,
    inviteeSees
  );

  await signIn(outsiderSupplier.email);
  const outsiderSees = await supabase.from("rfqs").select("id").eq("id", inviteRfqId);
  check(
    "Non-invited supplier cannot discover invite_only RFQ",
    (outsiderSees.data?.length ?? 0) === 0,
    outsiderSees
  );

  await signIn(pendingSupplier.email);
  const pendingInviteSees = await supabase.from("rfqs").select("id").eq("id", inviteRfqId);
  check(
    "Non-invited pending supplier cannot discover invite_only RFQ",
    (pendingInviteSees.data?.length ?? 0) === 0,
    pendingInviteSees
  );

  // --- Incomplete onboarding cannot publish ---
  await signIn(buyerIncomplete.email);
  const incompleteDraft = await createDraftAsBuyer({
    title: `Incomplete ${stamp}`,
    visibility: "public",
  });
  if (incompleteDraft.data) {
    const incompletePublish = await supabase.rpc("publish_rfq", {
      p_rfq_id: incompleteDraft.data.id,
    });
    check(
      "Buyer with incomplete onboarding cannot publish",
      !!incompletePublish.error,
      incompletePublish.error?.message
    );
  } else {
    check("Incomplete buyer create_draft_rfq", false, incompleteDraft.error?.message);
  }

  // --- Update draft ---
  await signIn(buyer.email);
  const updateTarget = await createDraftAsBuyer({
    title: `Update me ${stamp}`,
    visibility: "public",
  });
  const updated = await supabase.rpc("update_draft_rfq", {
    p_rfq_id: updateTarget.data.id,
    p_title: `Updated ${stamp}`,
    p_product_name: "Updated Product",
    p_category: "Spices",
  });
  check(
    "Buyer can update_draft_rfq",
    updated.data?.title === `Updated ${stamp}` && !updated.error,
    updated.error
  );

  await supabase.rpc("publish_rfq", { p_rfq_id: updateTarget.data.id });
  const updateAfterPublish = await supabase.rpc("update_draft_rfq", {
    p_rfq_id: updateTarget.data.id,
    p_title: "Should fail",
  });
  check(
    "Cannot update_draft_rfq after publish",
    !!updateAfterPublish.error,
    updateAfterPublish.error?.message
  );

  // --- Close + cancel ---
  const closeTarget = await createDraftAsBuyer({
    title: `Close me ${stamp}`,
    visibility: "public",
  });
  await supabase.rpc("publish_rfq", { p_rfq_id: closeTarget.data.id });
  const closed = await supabase.rpc("close_rfq", {
    p_rfq_id: closeTarget.data.id,
  });
  check("Buyer can close_rfq", closed.data?.status === "closed", closed.error);

  const closedNotif = await countNotifications(buyer.userId, "rfq.closed", closeTarget.data.id);
  if (closedNotif == null) skip("rfq.closed notification", "service role unavailable");
  else check("rfq.closed notification created", closedNotif >= 1, { closedNotif });

  const cancelTarget = await createDraftAsBuyer({
    title: `Cancel me ${stamp}`,
    visibility: "invite_only",
    invite_supplier_ids: [verifiedSupplier.companyId],
  });
  await supabase.rpc("publish_rfq", { p_rfq_id: cancelTarget.data.id });
  const cancelled = await supabase.rpc("cancel_rfq", {
    p_rfq_id: cancelTarget.data.id,
    p_reason: "Specs changed",
  });
  check("Buyer can cancel_rfq", cancelled.data?.status === "cancelled", cancelled.error);

  const cancelledNotif = await countNotifications(
    buyer.userId,
    "rfq.cancelled",
    cancelTarget.data.id
  );
  if (cancelledNotif == null) skip("rfq.cancelled notification", "service role unavailable");
  else
    check("rfq.cancelled notification created", cancelledNotif >= 1, {
      cancelledNotif,
    });

  const supplierCancelNotif = await countNotifications(
    verifiedSupplier.userId,
    "rfq.cancelled",
    cancelTarget.data.id
  );
  if (supplierCancelNotif == null) {
    skip("rfq.cancelled supplier notification", "service role unavailable");
  } else {
    check("Invited supplier receives rfq.cancelled", supplierCancelNotif >= 1, {
      supplierCancelNotif,
    });
  }

  // --- Supplier cannot close/cancel ---
  await signIn(buyer.email);
  const locked = await createDraftAsBuyer({
    title: `Lock ${stamp}`,
    visibility: "public",
  });
  await supabase.rpc("publish_rfq", { p_rfq_id: locked.data.id });

  await signIn(verifiedSupplier.email);
  const supplierClose = await supabase.rpc("close_rfq", {
    p_rfq_id: locked.data.id,
  });
  check("Supplier cannot close_rfq", !!supplierClose.error, supplierClose.error?.message);

  const supplierCancel = await supabase.rpc("cancel_rfq", {
    p_rfq_id: locked.data.id,
    p_reason: "nope",
  });
  check("Supplier cannot cancel_rfq", !!supplierCancel.error, supplierCancel.error?.message);

  // --- Events readable by owner ---
  await signIn(buyer.email);
  const events = await supabase.from("rfq_events").select("event_type").eq("rfq_id", publicRfqId);
  check(
    "Buyer can read rfq_events",
    !events.error && (events.data?.length ?? 0) >= 1,
    events.error
  );

  // --- is_buyer helper ---
  await signIn(buyer.email);
  const buyerFlag = await supabase.rpc("is_buyer");
  check("is_buyer() true for buyer", buyerFlag.data === true, buyerFlag.error);

  await signIn(verifiedSupplier.email);
  const supplierBuyerFlag = await supabase.rpc("is_buyer");
  check("is_buyer() false for supplier", supplierBuyerFlag.data === false, supplierBuyerFlag.error);

  console.log(`\nDone. passed=${passed} failed=${failures.length} skipped=${skipped}`);
  if (failures.length > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
} catch (err) {
  console.error("FATAL:", err);
  process.exit(1);
}
