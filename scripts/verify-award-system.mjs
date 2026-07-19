// Award & Supplier Selection verification (migration 016 / Module 2B).
//
// Run AFTER applying:
//   supabase/migrations/014_rfq_foundation.sql
//   supabase/migrations/015_quotation_system.sql
//   supabase/migrations/016_award_system.sql
//
//   node --use-system-ca scripts/verify-award-system.mjs

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
  const awardProbe = await supabase.from("quotation_awards").select("id").limit(1);
  const awardMsg = awardProbe.error?.message || "";
  if (/Could not find the table|relation .* does not exist|42P01/i.test(awardMsg)) {
    console.error(
      "\nMigration 016 is NOT applied yet (quotation_awards missing).\n" +
        "Apply supabase/migrations/016_award_system.sql then re-run.\n"
    );
    process.exit(2);
  }

  const rpcProbe = await supabase.rpc("award_supplier", {
    p_rfq_id: "00000000-0000-0000-0000-000000000000",
    p_thread_id: "00000000-0000-0000-0000-000000000000",
  });
  const rpcMsg = rpcProbe.error?.message || "";
  if (/function.*does not exist|Could not find the function|PGRST202/i.test(rpcMsg)) {
    console.error("\nMigration 016 RPCs missing (award_supplier).\n");
    process.exit(2);
  }
}

async function provisionUser(label, role, extras = {}) {
  const email = `award-${role}-${label}-${stamp}@tradegrid.test`;
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
    p_title: overrides.title ?? `Award RFQ ${stamp}`,
    p_product_name: "Basmati Rice",
    p_category: "Rice",
    p_visibility: overrides.visibility ?? "public",
    p_required_certifications: ["ISO 22000"],
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
  console.log("PASS - Migration 016 award schema / award_supplier reachable");
  passed++;

  const buyer = await provisionUser("owner", "buyer");
  const outsiderBuyer = await provisionUser("outsider", "buyer");
  const winner = await provisionUser("winner", "supplier");
  const loser = await provisionUser("loser", "supplier");
  const peer = await provisionUser("peer", "supplier");

  // Schema probes
  const eventsProbe = await supabase.from("award_events").select("id").limit(1);
  check("award_events table readable under RLS", !eventsProbe.error, eventsProbe.error);

  await signIn(buyer.email);
  const rfq = await createAndPublishRfq({ title: `Award compare RFQ ${stamp}` });

  await signIn(winner.email);
  const winnerOffer = await submitOffer(rfq.id, 900);
  const winnerThreadId = winnerOffer.thread_id;

  await signIn(loser.email);
  const loserOffer = await submitOffer(rfq.id, 950);
  const loserThreadId = loserOffer.thread_id;

  // Cross-company: outsider buyer cannot award
  await signIn(outsiderBuyer.email);
  const outsiderAward = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: winnerThreadId,
  });
  check(
    "Only RFQ owner may award (outsider buyer denied)",
    !!outsiderAward.error,
    outsiderAward.error?.message
  );

  // Supplier cannot award
  await signIn(winner.email);
  const supplierAward = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: winnerThreadId,
  });
  check("Supplier cannot award_supplier", !!supplierAward.error, supplierAward.error?.message);

  // Happy path award
  await signIn(buyer.email);
  const awarded = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: winnerThreadId,
    p_notes: "Best landed cost",
  });
  check(
    "Buyer can award_supplier exactly once (first award)",
    awarded.data?.status === "active" && !awarded.error,
    awarded.error
  );
  const awardId = awarded.data?.id;

  // Cannot award twice
  const secondAward = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: loserThreadId,
  });
  check("Cannot award twice on same RFQ", !!secondAward.error, secondAward.error?.message);

  // RFQ locked
  const rfqAfter = await supabase.from("rfqs").select("status").eq("id", rfq.id).single();
  check("RFQ status becomes awarded", rfqAfter.data?.status === "awarded", rfqAfter);

  // Winning / losing offer statuses
  const winnerOfferRow = await supabase
    .from("quotation_offers")
    .select("status")
    .eq("id", winnerOffer.id)
    .single();
  check(
    "Winning quotation updated to awarded",
    winnerOfferRow.data?.status === "awarded",
    winnerOfferRow
  );

  const loserOfferRow = await supabase
    .from("quotation_offers")
    .select("status")
    .eq("id", loserOffer.id)
    .single();
  check(
    "Losing quotation updated to not_selected",
    loserOfferRow.data?.status === "not_selected",
    loserOfferRow
  );

  const winnerThread = await supabase
    .from("quotation_threads")
    .select("status, awarded_offer_id")
    .eq("id", winnerThreadId)
    .single();
  check(
    "Winning thread marked awarded with awarded_offer_id",
    winnerThread.data?.status === "awarded" &&
      winnerThread.data?.awarded_offer_id === winnerOffer.id,
    winnerThread
  );

  // Cannot submit after award
  await signIn(peer.email);
  const lateQuote = await supabase.rpc("submit_quotation", {
    p_rfq_id: rfq.id,
    p_unit_price: 800,
  });
  check("Cannot submit quotation after award", !!lateQuote.error, lateQuote.error?.message);

  // Cannot award closed RFQ
  await signIn(buyer.email);
  const closeRfq = await createAndPublishRfq({
    title: `Closed award RFQ ${stamp}`,
  });
  await signIn(winner.email);
  const closeOffer = await submitOffer(closeRfq.id, 700);
  await signIn(buyer.email);
  await supabase.rpc("close_rfq", { p_rfq_id: closeRfq.id });
  const awardClosed = await supabase.rpc("award_supplier", {
    p_rfq_id: closeRfq.id,
    p_thread_id: closeOffer.thread_id,
  });
  check("Cannot award closed RFQ", !!awardClosed.error, awardClosed.error?.message);

  // get_award
  await signIn(buyer.email);
  const buyerGet = await supabase.rpc("get_award", { p_rfq_id: rfq.id });
  check(
    "Buyer get_award returns active award",
    buyerGet.data?.awarded === true && buyerGet.data?.award?.id === awardId,
    buyerGet.error
  );

  await signIn(winner.email);
  const winnerGet = await supabase.rpc("get_award", { p_rfq_id: rfq.id });
  check(
    "Winning supplier get_award is_winner",
    winnerGet.data?.is_winner === true && winnerGet.data?.award?.id === awardId,
    winnerGet.error
  );

  await signIn(loser.email);
  const loserGet = await supabase.rpc("get_award", { p_rfq_id: rfq.id });
  check(
    "Losing supplier get_award without peer commercial award payload",
    loserGet.data?.awarded === true &&
      loserGet.data?.is_winner === false &&
      loserGet.data?.award == null,
    loserGet
  );

  // RLS: supplier reads only own awards
  await signIn(winner.email);
  const winnerAwards = await supabase.from("quotation_awards").select("id").eq("id", awardId);
  check("Winning supplier can read own award row", (winnerAwards.data?.length ?? 0) === 1);

  await signIn(loser.email);
  const loserAwards = await supabase.from("quotation_awards").select("id").eq("id", awardId);
  check(
    "Losing supplier cannot read winner award row via RLS",
    (loserAwards.data?.length ?? 0) === 0,
    loserAwards
  );

  await signIn(peer.email);
  const peerAwards = await supabase.from("quotation_awards").select("id").eq("id", awardId);
  check(
    "Unrelated supplier cannot read award (cross-company isolation)",
    (peerAwards.data?.length ?? 0) === 0,
    peerAwards
  );

  // Audit events
  await signIn(buyer.email);
  const awardEvents = await supabase
    .from("award_events")
    .select("event_type")
    .eq("award_id", awardId);
  check(
    "Audit events created for award",
    (awardEvents.data ?? []).some((e) => e.event_type === "award.created"),
    awardEvents
  );

  // Notifications
  const winnerNotif = await countNotifications(winner.userId, "quotation.awarded", winnerThreadId);
  if (winnerNotif == null) skip("quotation.awarded notification", "no service role");
  else
    check("Winner receives quotation.awarded", winnerNotif >= 1, {
      winnerNotif,
    });

  const loserNotif = await countNotifications(
    loser.userId,
    "quotation.not_selected",
    loserThreadId
  );
  if (loserNotif == null) skip("quotation.not_selected notification", "no service role");
  else
    check("Loser receives quotation.not_selected", loserNotif >= 1, {
      loserNotif,
    });

  const buyerNotif = await countNotifications(buyer.userId, "rfq.awarded", rfq.id);
  if (buyerNotif == null) skip("rfq.awarded notification", "no service role");
  else check("Buyer receives rfq.awarded", buyerNotif >= 1, { buyerNotif });

  // Optional revoke restores quoted + allows re-award
  await signIn(buyer.email);
  const revoked = await supabase.rpc("revoke_award", {
    p_award_id: awardId,
    p_reason: "Re-evaluate",
  });
  check(
    "Buyer can revoke_award",
    revoked.data?.status === "revoked" && !revoked.error,
    revoked.error
  );

  const rfqReopened = await supabase.from("rfqs").select("status").eq("id", rfq.id).single();
  check("RFQ returns to quoted after revoke", rfqReopened.data?.status === "quoted", rfqReopened);

  const reaward = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: loserThreadId,
    p_notes: "Re-awarded to alternate",
  });
  check(
    "Can award again after revoke (history preserved)",
    reaward.data?.status === "active" && !reaward.error,
    reaward.error
  );

  const history = await supabase.from("quotation_awards").select("id, status").eq("rfq_id", rfq.id);
  check(
    "Award history never deleted (revoked + active rows)",
    (history.data ?? []).length >= 2 &&
      (history.data ?? []).some((a) => a.status === "revoked") &&
      (history.data ?? []).some((a) => a.status === "active"),
    history.data
  );

  // Direct insert denied
  await signIn(buyer.email);
  const directInsert = await supabase.from("quotation_awards").insert({
    rfq_id: rfq.id,
    thread_id: winnerThreadId,
    offer_id: winnerOffer.id,
    supplier_company_id: winner.companyId,
    status: "active",
  });
  check("Direct INSERT into quotation_awards denied", !!directInsert.error);

  console.log(`\nDone. passed=${passed} failed=${failures.length} skipped=${skipped}`);
  if (failures.length > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
} catch (err) {
  console.error("FATAL:", err);
  process.exit(1);
}
