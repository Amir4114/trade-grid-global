// Order Fulfillment System verification (migration 018 / Module 3.2 Phase A).
//
// Run AFTER applying:
//   supabase/migrations/017_purchase_order_system.sql
//   supabase/migrations/018_order_fulfillment_system.sql
//
//   node --use-system-ca scripts/verify-order-fulfillment-system.mjs

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = readFileSync(".env.local", "utf8")
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )
  process.exit(1)
}

const supabase = createClient(url, anonKey)
const serviceClient = serviceKey ? createClient(url, serviceKey) : null

const stamp = Date.now()
const password = "TestPass123!"
let passed = 0
let skipped = 0
const failures = []

function check(desc, ok, extra) {
  if (ok) {
    passed++
    console.log(`PASS - ${desc}`)
  } else {
    failures.push({ desc, extra })
    console.log(`FAIL - ${desc}${extra ? ` :: ${JSON.stringify(extra)}` : ""}`)
  }
}

function skip(desc, reason) {
  skipped++
  console.log(`SKIP - ${desc} (${reason})`)
}

function fatal(message) {
  console.error(`\nFATAL: ${message}`)
  process.exit(1)
}

async function signIn(email) {
  await supabase.auth.signOut()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) fatal(`sign in failed for ${email}: ${error.message}`)
}

async function assertMigrationsApplied() {
  const probe = await supabase.from("fulfillment_orders").select("id").limit(1)
  const msg = probe.error?.message || ""
  if (/Could not find the table|relation .* does not exist|42P01/i.test(msg)) {
    console.error(
      "\nMigration 018 is NOT applied yet (fulfillment_orders missing).\n" +
        "Apply supabase/migrations/018_order_fulfillment_system.sql then re-run.\n"
    )
    process.exit(2)
  }

  const rpcProbe = await supabase.rpc("start_production", {
    p_fulfillment_id: "00000000-0000-0000-0000-000000000000",
  })
  const rpcMsg = rpcProbe.error?.message || ""
  if (
    /function.*does not exist|Could not find the function|PGRST202/i.test(
      rpcMsg
    )
  ) {
    console.error("\nMigration 018 RPCs missing (start_production).\n")
    process.exit(2)
  }

  const phaseBProbe = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: "00000000-0000-0000-0000-000000000000",
    p_milestone_type: "shipment_booked",
  })
  const phaseBMsg = phaseBProbe.error?.message || ""
  if (
    /function.*does not exist|Could not find the function|PGRST202/i.test(
      phaseBMsg
    )
  ) {
    console.error(
      "\nMigration 023 Phase B RPCs missing (add_fulfillment_milestone).\n"
    )
    process.exit(2)
  }
}

async function provisionUser(label, role) {
  const email = `ff-${role}-${label}-${stamp}@tradegrid.test`
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tradegrid_marketplace_signup: true,
        marketplace_role: role,
        full_name: `${label} ${role}`,
        company_name: `${label} ${role} Co`,
      },
    },
  })
  if (error) fatal(`${label} signup failed: ${error.message}`)
  const userId = data.user?.id
  const writer = serviceClient ?? supabase

  const companyUpdate = {
    country: "India",
    business_type: role === "supplier" ? "Manufacturer" : "Importer",
    company_structure: "Private Limited",
    categories: ["Rice"],
    export_markets: role === "supplier" ? ["UAE"] : [],
    target_markets: role === "buyer" ? ["India"] : [],
    onboarding_completed: true,
    onboarding_step: "completed",
    ...(serviceClient ? { verification_status: "verified" } : {}),
  }
  const updated = await writer
    .from("companies")
    .update(companyUpdate)
    .eq("user_id", userId)
  if (updated.error)
    fatal(`${label} company update failed: ${updated.error.message}`)

  const { data: company, error: companyError } = await writer
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (companyError)
    fatal(`${label} company load failed: ${companyError.message}`)
  return { email, userId, companyId: company.id }
}

async function countNotifications(userId, type, entityId) {
  const reader = serviceClient ?? supabase
  let query = reader
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("type", type)
  if (entityId) query = query.eq("entity_id", entityId)
  const { count, error } = await query
  if (error) return null
  return count ?? 0
}

async function createAwardedPo(buyer, supplier) {
  await signIn(buyer.email)
  const { data: rfq, error: rfqErr } = await supabase.rpc("create_draft_rfq", {
    p_title: `FF RFQ ${stamp}`,
    p_product_name: "Basmati Rice",
    p_category: "Rice",
    p_visibility: "public",
    p_quantity_value: 50,
    p_quantity_unit: "MT",
    p_quote_deadline_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  })
  if (rfqErr) fatal(`create_draft_rfq: ${rfqErr.message}`)
  const published = await supabase.rpc("publish_rfq", { p_rfq_id: rfq.id })
  if (published.error) fatal(`publish_rfq: ${published.error.message}`)

  await signIn(supplier.email)
  const offer = await supabase.rpc("submit_quotation", {
    p_rfq_id: rfq.id,
    p_currency: "USD",
    p_unit_price: 900,
    p_price_unit: "MT",
    p_incoterm: "FOB",
    p_lead_time_min: 10,
    p_lead_time_max: 20,
  })
  if (offer.error) fatal(`submit_quotation: ${offer.error.message}`)

  await signIn(buyer.email)
  const award = await supabase.rpc("award_supplier", {
    p_rfq_id: rfq.id,
    p_thread_id: offer.data.thread_id,
  })
  if (award.error) fatal(`award_supplier: ${award.error.message}`)

  const draft = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: award.data.id,
  })
  if (draft.error) fatal(`create_purchase_order_draft: ${draft.error.message}`)

  const issued = await supabase.rpc("issue_purchase_order", {
    p_purchase_order_id: draft.data.id,
  })
  if (issued.error) fatal(`issue_purchase_order: ${issued.error.message}`)

  return { rfq, offer: offer.data, award: award.data, po: issued.data }
}

try {
  await assertMigrationsApplied()
  console.log(
    "PASS - Migration 018 fulfillment_orders / start_production reachable"
  )
  passed++

  const buyer = await provisionUser("owner", "buyer")
  const outsider = await provisionUser("outsider", "buyer")
  const supplier = await provisionUser("maker", "supplier")
  const peer = await provisionUser("peer", "supplier")

  const eventsProbe = await supabase
    .from("fulfillment_order_events")
    .select("id")
    .limit(1)
  check(
    "fulfillment_order_events readable under RLS",
    !eventsProbe.error,
    eventsProbe.error
  )

  if (serviceClient) {
    const bucket = await serviceClient.storage.getBucket("fulfillment-docs")
    check(
      "fulfillment-docs bucket exists (private)",
      !!bucket.data && bucket.data.public === false,
      bucket.error?.message ?? bucket.data
    )
  } else {
    skip("fulfillment-docs bucket probe", "no service role")
  }

  const { po } = await createAwardedPo(buyer, supplier)

  // Accept auto-creates fulfillment
  await signIn(supplier.email)
  const accepted = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: po.id,
  })
  check(
    "Supplier accept_purchase_order succeeds",
    accepted.data?.status === "accepted" && !accepted.error,
    accepted.error
  )

  await signIn(buyer.email)
  const foList = await supabase
    .from("fulfillment_orders")
    .select("*")
    .eq("purchase_order_id", po.id)
  check(
    "Auto-create fulfillment on PO accept (AD-3.2-004)",
    (foList.data?.length ?? 0) === 1 && foList.data?.[0]?.status === "opened",
    foList
  )
  const foId = foList.data?.[0]?.id
  const foNumber = foList.data?.[0]?.fulfillment_number
  check(
    "Fulfillment number TGG-FF-YYYY-######",
    typeof foNumber === "string" && /^TGG-FF-\d{4}-\d{6}$/.test(foNumber),
    foNumber
  )

  const buyerMilestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "shipment_booked",
  })
  check("Buyer cannot add supplier milestone", !!buyerMilestone.error)

  const buyerComment = await supabase.rpc("add_fulfillment_comment", {
    p_fulfillment_id: foId,
    p_comment: "Buyer operational note",
  })
  check(
    "Buyer can append fulfillment comment",
    buyerComment.data?.event_type === "fulfillment.comment_added" &&
      !buyerComment.error,
    buyerComment.error
  )

  await signIn(supplier.email)
  const backdatedMilestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "shipment_booked",
    p_occurred_at: new Date(
      Date.parse(foList.data[0].opened_at) - 1000
    ).toISOString(),
  })
  check(
    "Milestone cannot predate its lifecycle prerequisite",
    !!backdatedMilestone.error
  )
  const milestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "shipment_booked",
    p_notes: "Space reserved with carrier",
  })
  check(
    "Supplier can append fulfillment milestone",
    milestone.data?.event_type === "fulfillment.milestone_completed" &&
      !milestone.error,
    milestone.error
  )
  const duplicateMilestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "shipment_booked",
  })
  check("Duplicate canonical milestone is rejected", !!duplicateMilestone.error)
  const prematureMilestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "delivered",
  })
  check(
    "Milestone cannot contradict current status",
    !!prematureMilestone.error
  )

  // Cross-company isolation
  await signIn(outsider.email)
  const outsiderRead = await supabase
    .from("fulfillment_orders")
    .select("id")
    .eq("id", foId)
  check(
    "Outsider buyer cannot read fulfillment",
    (outsiderRead.data?.length ?? 0) === 0
  )

  await signIn(peer.email)
  const peerRead = await supabase
    .from("fulfillment_orders")
    .select("id")
    .eq("id", foId)
  check(
    "Peer supplier cannot read fulfillment",
    (peerRead.data?.length ?? 0) === 0
  )
  const peerMilestone = await supabase.rpc("add_fulfillment_milestone", {
    p_fulfillment_id: foId,
    p_milestone_type: "container_loaded",
  })
  check("Peer supplier cannot add milestone", !!peerMilestone.error)
  const peerComment = await supabase.rpc("add_fulfillment_comment", {
    p_fulfillment_id: foId,
    p_comment: "unauthorized comment",
  })
  check("Peer supplier cannot add comment", !!peerComment.error)

  // Buyer cannot start production
  await signIn(buyer.email)
  const buyerStart = await supabase.rpc("start_production", {
    p_fulfillment_id: foId,
  })
  check("Buyer cannot start_production", !!buyerStart.error)

  // Happy path through QC (mandatory)
  await signIn(supplier.email)
  const started = await supabase.rpc("start_production", {
    p_fulfillment_id: foId,
    p_production_location: "Plant A",
  })
  check(
    "start_production opened → in_production",
    started.data?.status === "in_production"
  )

  const skipQc = await supabase.rpc("pack_order", { p_fulfillment_id: foId })
  check("Cannot skip QC (pack from in_production denied)", !!skipQc.error)

  const toQc = await supabase.rpc("complete_production", {
    p_fulfillment_id: foId,
  })
  check(
    "complete_production → quality_check",
    toQc.data?.status === "quality_check"
  )

  const passedQc = await supabase.rpc("pass_qc", { p_fulfillment_id: foId })
  check("pass_qc → packaging", passedQc.data?.status === "packaging")

  const packed = await supabase.rpc("pack_order", { p_fulfillment_id: foId })
  check("pack_order → ready_to_ship", packed.data?.status === "ready_to_ship")

  const shipped = await supabase.rpc("mark_shipped", {
    p_fulfillment_id: foId,
    p_tracking_reference: "TRACK-1",
  })
  check("mark_shipped → shipped", shipped.data?.status === "shipped")

  // Cancel after ship denied
  await signIn(buyer.email)
  const cancelShipped = await supabase.rpc("cancel_fulfillment", {
    p_fulfillment_id: foId,
    p_reason: "too late",
  })
  check("Buyer cannot cancel after shipped", !!cancelShipped.error)

  await signIn(supplier.email)
  const transit = await supabase.rpc("mark_in_transit", {
    p_fulfillment_id: foId,
  })
  check("mark_in_transit → in_transit", transit.data?.status === "in_transit")

  const delivered = await supabase.rpc("mark_delivered", {
    p_fulfillment_id: foId,
  })
  check(
    "Supplier mark_delivered → delivered",
    delivered.data?.status === "delivered"
  )

  // Supplier cannot complete
  const supplierComplete = await supabase.rpc("complete_fulfillment", {
    p_fulfillment_id: foId,
  })
  check("Supplier cannot complete_fulfillment", !!supplierComplete.error)

  await signIn(buyer.email)
  const completed = await supabase.rpc("complete_fulfillment", {
    p_fulfillment_id: foId,
  })
  check(
    "Buyer complete_fulfillment delivered → completed",
    completed.data?.status === "completed" && !completed.error,
    completed.error
  )

  // Events
  const ev = await supabase
    .from("fulfillment_order_events")
    .select("event_type")
    .eq("fulfillment_order_id", foId)
  const types = (ev.data ?? []).map((e) => e.event_type)
  check(
    "Audit events for opened/production/qc/ship/complete",
    types.includes("fulfillment.opened") &&
      types.includes("fulfillment.production_started") &&
      types.includes("fulfillment.qc_passed") &&
      types.includes("fulfillment.shipped") &&
      types.includes("fulfillment.completed"),
    types
  )

  // Append-only
  if (serviceClient) {
    const first = await serviceClient
      .from("fulfillment_order_events")
      .select("id")
      .eq("fulfillment_order_id", foId)
      .limit(1)
      .single()
    if (first.data?.id) {
      const upd = await serviceClient
        .from("fulfillment_order_events")
        .update({ message: "tamper" })
        .eq("id", first.data.id)
      check(
        "Event UPDATE blocked (append-only)",
        !!upd.error,
        upd.error?.message
      )
    } else {
      skip("append-only update probe", "no event id")
    }
  } else {
    skip("append-only update probe", "no service role")
  }

  // Direct insert denied
  await signIn(buyer.email)
  const direct = await supabase.from("fulfillment_orders").insert({
    fulfillment_number: `TGG-FF-FAKE-${stamp}`,
    purchase_order_id: po.id,
    buyer_company_id: buyer.companyId,
    supplier_company_id: supplier.companyId,
    status: "opened",
  })
  check("Direct INSERT into fulfillment_orders denied", !!direct.error)

  // get / list
  const detail = await supabase.rpc("get_fulfillment", {
    p_fulfillment_id: foId,
  })
  check(
    "get_fulfillment returns aggregate",
    detail.data?.fulfillment_order?.id === foId &&
      Array.isArray(detail.data?.events) &&
      !detail.error,
    detail.error
  )
  const aggregateEvents = detail.data?.events ?? []
  const timelineTimes = aggregateEvents.map((event) =>
    Date.parse(event.metadata?.occurred_at ?? event.created_at)
  )
  check(
    "get_fulfillment timeline is chronological",
    timelineTimes.every(
      (time, index) => index === 0 || timelineTimes[index - 1] <= time
    ),
    timelineTimes
  )
  check(
    "Timeline contains milestone and comment events",
    aggregateEvents.some(
      (event) => event.event_type === "fulfillment.milestone_completed"
    ) &&
      aggregateEvents.some(
        (event) => event.event_type === "fulfillment.comment_added"
      )
  )

  const listed = await supabase.rpc("list_fulfillments", {
    p_status: "completed",
  })
  check(
    "list_fulfillments filters completed",
    Array.isArray(listed.data?.rows) &&
      listed.data.rows.some((r) => r.id === foId) &&
      !listed.error,
    listed.error
  )

  // Cancel path on second PO + dispute path on third
  const flow2 = await createAwardedPo(buyer, supplier)
  await signIn(supplier.email)
  await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: flow2.po.id,
  })
  await signIn(buyer.email)
  const fo2 = await supabase
    .from("fulfillment_orders")
    .select("id")
    .eq("purchase_order_id", flow2.po.id)
    .single()
  const missingCancelReason = await supabase.rpc("cancel_fulfillment", {
    p_fulfillment_id: fo2.data.id,
  })
  check("Cancellation requires a reason", !!missingCancelReason.error)
  const cancelled = await supabase.rpc("cancel_fulfillment", {
    p_fulfillment_id: fo2.data.id,
    p_reason: "Hold project",
  })
  check(
    "Buyer cancel_fulfillment from opened",
    cancelled.data?.status === "cancelled" && !cancelled.error,
    cancelled.error
  )

  // Rework QC path
  const flow3 = await createAwardedPo(buyer, supplier)
  await signIn(supplier.email)
  await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: flow3.po.id,
  })
  const fo3row = await supabase
    .from("fulfillment_orders")
    .select("id")
    .eq("purchase_order_id", flow3.po.id)
    .single()
  const fo3 = fo3row.data.id
  await supabase.rpc("start_production", { p_fulfillment_id: fo3 })
  await supabase.rpc("complete_production", { p_fulfillment_id: fo3 })
  const rework = await supabase.rpc("fail_qc", {
    p_fulfillment_id: fo3,
    p_reason: "Moisture high",
    p_terminal: false,
  })
  check(
    "fail_qc rework → in_production",
    rework.data?.status === "in_production"
  )

  await supabase.rpc("complete_production", { p_fulfillment_id: fo3 })
  await supabase.rpc("pass_qc", { p_fulfillment_id: fo3 })
  await supabase.rpc("pack_order", { p_fulfillment_id: fo3 })
  await supabase.rpc("mark_shipped", { p_fulfillment_id: fo3 })
  await supabase.rpc("mark_in_transit", { p_fulfillment_id: fo3 })
  await supabase.rpc("mark_delivered", { p_fulfillment_id: fo3 })

  const supplierDispute = await supabase.rpc("raise_fulfillment_dispute", {
    p_fulfillment_id: fo3,
    p_reason: "supplier cannot impose hold",
  })
  check("Supplier cannot raise fulfillment dispute", !!supplierDispute.error)

  await signIn(buyer.email)
  const disputed = await supabase.rpc("raise_fulfillment_dispute", {
    p_fulfillment_id: fo3,
    p_reason: "Delivery condition requires review",
  })
  check(
    "Buyer can raise post-shipment dispute",
    disputed.data?.is_disputed === true && !disputed.error,
    disputed.error
  )
  const disputedCompletion = await supabase.rpc("complete_fulfillment", {
    p_fulfillment_id: fo3,
  })
  check("Disputed fulfillment cannot complete", !!disputedCompletion.error)

  // Notifications
  const openedNotif = await countNotifications(
    buyer.userId,
    "fulfillment.opened",
    foId
  )
  if (openedNotif == null)
    skip("fulfillment.opened notification", "no service role")
  else
    check("Buyer receives fulfillment.opened", openedNotif >= 1, {
      openedNotif,
    })

  const shippedNotif = await countNotifications(
    buyer.userId,
    "fulfillment.shipped",
    foId
  )
  if (shippedNotif == null)
    skip("fulfillment.shipped notification", "no service role")
  else
    check("Buyer receives fulfillment.shipped", shippedNotif >= 1, {
      shippedNotif,
    })

  const milestoneNotif = await countNotifications(
    buyer.userId,
    "fulfillment.milestone_completed",
    foId
  )
  if (milestoneNotif == null)
    skip("fulfillment.milestone_completed notification", "no service role")
  else
    check("Buyer receives milestone notification", milestoneNotif >= 1, {
      milestoneNotif,
    })

  // Leave one opened record for role-specific browser verification.
  const browserFlow = await createAwardedPo(buyer, supplier)
  await signIn(supplier.email)
  const browserAccepted = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: browserFlow.po.id,
  })
  const browserFulfillment = await supabase
    .from("fulfillment_orders")
    .select("id, fulfillment_number, status")
    .eq("purchase_order_id", browserFlow.po.id)
    .single()
  check(
    "Browser fixture fulfillment is opened",
    !browserAccepted.error &&
      !browserFulfillment.error &&
      browserFulfillment.data?.status === "opened",
    browserAccepted.error ?? browserFulfillment.error
  )

  const firstPage = await supabase.rpc("list_fulfillments", {
    p_limit: 1,
    p_offset: 0,
  })
  const secondPage = await supabase.rpc("list_fulfillments", {
    p_limit: 1,
    p_offset: 1,
  })
  check(
    "list_fulfillments pagination returns stable distinct pages",
    !firstPage.error &&
      !secondPage.error &&
      firstPage.data?.rows?.length === 1 &&
      secondPage.data?.rows?.length === 1 &&
      firstPage.data.rows[0].id !== secondPage.data.rows[0].id,
    firstPage.error ?? secondPage.error
  )

  console.log(
    "BROWSER_FIXTURE",
    JSON.stringify({
      buyerEmail: buyer.email,
      supplierEmail: supplier.email,
      password,
      fulfillmentId: browserFulfillment.data?.id,
      fulfillmentNumber: browserFulfillment.data?.fulfillment_number,
    })
  )

  console.log(
    `\nDone. passed=${passed} failed=${failures.length} skipped=${skipped}`
  )
  if (failures.length > 0) {
    console.error("Failures:", failures)
    process.exit(1)
  }
} catch (err) {
  console.error("FATAL:", err)
  process.exit(1)
}
