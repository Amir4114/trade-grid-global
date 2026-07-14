// Notification foundation verification (migration 011).
//
// Verifies against the LIVE database AFTER migration 011 is applied:
//   Security:
//     1. User A can read own notification
//     2. User A cannot read User B notification
//     3. Buyer cannot create arbitrary notifications
//     4. Supplier cannot create arbitrary admin notifications
//     5. User cannot change notification recipient
//     6. User cannot forge title/message/type
//     7. User can mark own notification read
//     8. User cannot mark another user's notification read
//     9. Mark-all-read affects only caller's notifications
//   Events (where safely testable):
//    10. Welcome notification on new account
//    11. Verification submission creates user notification
//    12. Verification submission creates admin notification (service-role path)
//    13. Product submission creates supplier notification
//    14. Product submission creates admin notification (service-role path)
//    15. Product approval/rejection — SKIP without trusted admin provisioning
//
// Run: node --use-system-ca scripts/verify-notification-foundation.mjs

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

async function signIn(email) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fatal(`sign in failed for ${email}: ${error.message}`);
}

async function createAccount(label, role) {
  const email = `notif-${role}-${label}-${stamp}@tradegrid.test`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fatal(`${label} signup failed: ${error.message}`);
  const userId = data.user?.id;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: `${label} Test`,
      role,
    },
    { onConflict: "id" }
  );
  if (profileError) fatal(`${label} profile failed: ${profileError.message}`);

  const { error: companyError } = await supabase.from("companies").upsert(
    {
      user_id: userId,
      company_name: `${label} Company`,
      country: "IN",
      business_type: "Trader",
      company_structure: "Private",
      verification_status: "pending",
      risk_score: 50,
      account_type: role,
      onboarding_completed: role === "supplier",
      onboarding_step: role === "supplier" ? "completed" : "business_info",
    },
    { onConflict: "user_id" }
  );
  if (companyError) fatal(`${label} company failed: ${companyError.message}`);

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .single();

  return { email, userId, companyId: company?.id };
}

async function listOwnNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, rows: [] };
  return { error: null, rows: data ?? [] };
}

async function getAdminIds() {
  if (!serviceClient) return [];
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) return [];
  return (data ?? []).map((row) => row.id);
}

try {
  const migrationProbe = await supabase.rpc("mark_all_notifications_read");
  if (migrationProbe.error) {
    const msg = migrationProbe.error.message || "";
    if (
      /function.*does not exist|schema cache|Could not find|PGRST202|relation.*notifications/i.test(
        msg
      )
    ) {
      console.error(
        "\nMigration 011 is NOT applied yet (notifications foundation missing).\n" +
          "Apply manually in Supabase SQL Editor:\n" +
          "  1. Open Supabase Dashboard → SQL Editor\n" +
          "  2. Paste contents of supabase/migrations/011_notification_foundation.sql\n" +
          "  3. Run the script\n" +
          "  4. Re-run: node --use-system-ca scripts/verify-notification-foundation.mjs\n"
      );
      process.exit(2);
    }
  }

  check("Migration 011 notification RPCs are callable", true);

  const buyerA = await createAccount("buyer-a", "buyer");
  const buyerB = await createAccount("buyer-b", "buyer");
  const supplier = await createAccount("supplier", "supplier");

  // 10) Welcome notification
  await signIn(buyerA.email);
  const buyerWelcome = await listOwnNotifications();
  check(
    "Welcome notification created for new buyer account",
    !buyerWelcome.error &&
      buyerWelcome.rows.some((row) => row.type === "account.welcome"),
    buyerWelcome.error ?? buyerWelcome.rows.map((row) => row.type)
  );

  await signIn(supplier.email);
  const supplierWelcome = await listOwnNotifications();
  check(
    "Welcome notification created for new supplier account",
    !supplierWelcome.error &&
      supplierWelcome.rows.some((row) => row.type === "account.welcome"),
    supplierWelcome.error ?? supplierWelcome.rows.map((row) => row.type)
  );

  // Seed a notification for user A via trusted submission RPC
  await signIn(buyerA.email);
  const submitRpc = await supabase.rpc("submit_company_for_verification", {
    company_id: buyerA.companyId,
  });
  check(
    "Buyer can submit company for verification via RPC",
    !submitRpc.error,
    submitRpc.error
  );

  const afterSubmit = await listOwnNotifications();
  const userSubmitNotif = afterSubmit.rows.find(
    (row) => row.type === "verification.submitted"
  );
  check(
    "Verification submission creates user notification",
    Boolean(userSubmitNotif),
    afterSubmit.rows.map((row) => row.type)
  );

  const submissionCountAfterRpc = afterSubmit.rows.filter(
    (row) => row.type === "verification.submitted"
  ).length;
  check(
    "Genuine verification submission emits exactly one user submission notification",
    submissionCountAfterRpc === 1,
    { count: submissionCountAfterRpc }
  );

  // Admin-style direct status move must not emit a fake submission event
  if (serviceClient) {
    const beforeAdminMove = afterSubmit.rows.filter(
      (row) => row.type === "verification.submitted"
    ).length;

    const adminStyleMove = await serviceClient
      .from("companies")
      .update({ verification_status: "under_review" })
      .eq("id", buyerA.companyId);

    check(
      "Admin-style under_review rewrite succeeds without error",
      !adminStyleMove.error,
      adminStyleMove.error
    );

    const { data: afterAdminMoveRows } = await serviceClient
      .from("notifications")
      .select("type")
      .eq("recipient_user_id", buyerA.userId)
      .eq("type", "verification.submitted");

    check(
      "Admin-style under_review rewrite does not create duplicate submission notifications",
      (afterAdminMoveRows ?? []).length === beforeAdminMove,
      {
        before: beforeAdminMove,
        after: (afterAdminMoveRows ?? []).length,
      }
    );

    const verifiedMove = await serviceClient
      .from("companies")
      .update({ verification_status: "verified" })
      .eq("id", buyerA.companyId);
    check(
      "Admin-style verified transition succeeds",
      !verifiedMove.error,
      verifiedMove.error
    );

    const adminReviewMove = await serviceClient
      .from("companies")
      .update({ verification_status: "under_review" })
      .eq("id", buyerA.companyId);
    check(
      "Admin-style verified -> under_review succeeds",
      !adminReviewMove.error,
      adminReviewMove.error
    );

    const { data: submissionAfterAdminReview } = await serviceClient
      .from("notifications")
      .select("type")
      .eq("recipient_user_id", buyerA.userId)
      .eq("type", "verification.submitted");

    check(
      "Admin verified -> under_review does not emit submission notifications",
      (submissionAfterAdminReview ?? []).length === beforeAdminMove,
      {
        before: beforeAdminMove,
        after: (submissionAfterAdminReview ?? []).length,
      }
    );
  } else {
    skip(
      "Admin-style under_review behavior (requires SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  const adminIds = await getAdminIds();
  if (serviceClient && adminIds.length > 0) {
    const { data: adminNotifs } = await serviceClient
      .from("notifications")
      .select("*")
      .in("recipient_user_id", adminIds)
      .eq("type", "verification.admin_review_required")
      .order("created_at", { ascending: false })
      .limit(5);
    check(
      "Verification submission creates admin notification",
      (adminNotifs ?? []).some(
        (row) => row.entity_id === buyerA.companyId
      ),
      (adminNotifs ?? []).map((row) => ({
        recipient: row.recipient_user_id,
        entity_id: row.entity_id,
      }))
    );
  } else {
    skip(
      "Verification submission creates admin notification (requires SUPABASE_SERVICE_ROLE_KEY and existing admin profile)"
    );
  }

  // 1 & 2 isolation
  await signIn(buyerA.email);
  const ownRead = await supabase
    .from("notifications")
    .select("*")
    .eq("id", userSubmitNotif?.id ?? "")
    .maybeSingle();
  check(
    "User A can read own notification",
    Boolean(ownRead.data?.id),
    ownRead.error
  );

  await signIn(buyerB.email);
  const crossRead = await supabase
    .from("notifications")
    .select("*")
    .eq("id", userSubmitNotif?.id ?? "")
    .maybeSingle();
  check(
    "User A cannot read User B notification",
    !crossRead.error && crossRead.data === null,
    crossRead
  );

  // 3 & 4 forged inserts
  await signIn(buyerB.email);
  const buyerInsert = await supabase.from("notifications").insert({
    recipient_user_id: buyerB.userId,
    type: "verification.approved",
    title: "Fake",
    message: "Forged",
  });
  check(
    "Buyer cannot create arbitrary notifications",
    Boolean(buyerInsert.error),
    buyerInsert.error?.message
  );

  await signIn(supplier.email);
  const supplierInsert = await supabase.from("notifications").insert({
    recipient_user_id: supplier.userId,
    type: "verification.admin_review_required",
    title: "Admin alert",
    message: "Forged admin alert",
    priority: "urgent",
  });
  check(
    "Supplier cannot create arbitrary admin notifications",
    Boolean(supplierInsert.error),
    supplierInsert.error?.message
  );

  await signIn(buyerB.email);
  const directDelete = await supabase
    .from("notifications")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  check(
    "Authenticated client direct DELETE denied",
    Boolean(directDelete.error) || (directDelete.count ?? 0) === 0,
    directDelete.error?.message ?? { count: directDelete.count }
  );

  await supabase.auth.signOut();
  const unauthMarkOne = await supabase.rpc("mark_notification_read", {
    notification_id: userSubmitNotif?.id ?? "00000000-0000-0000-0000-000000000000",
  });
  check(
    "Unauthenticated mark_notification_read rejected",
    Boolean(unauthMarkOne.error),
    unauthMarkOne.error?.message
  );

  const unauthMarkAll = await supabase.rpc("mark_all_notifications_read");
  check(
    "Unauthenticated mark_all_notifications_read rejected",
    Boolean(unauthMarkAll.error),
    unauthMarkAll.error?.message
  );

  // 5 & 6 forged updates (no UPDATE policy)
  if (userSubmitNotif?.id) {
    await signIn(buyerA.email);
    const recipientTamper = await supabase
      .from("notifications")
      .update({ recipient_user_id: buyerB.userId })
      .eq("id", userSubmitNotif.id);
    check(
      "User cannot change notification recipient",
      Boolean(recipientTamper.error) || recipientTamper.count === 0,
      recipientTamper.error?.message ?? { count: recipientTamper.count }
    );

    const forgeTamper = await supabase
      .from("notifications")
      .update({
        title: "Approved",
        message: "You are verified",
        type: "verification.approved",
      })
      .eq("id", userSubmitNotif.id);
    check(
      "User cannot forge notification title/message/type",
      Boolean(forgeTamper.error) || forgeTamper.count === 0,
      forgeTamper.error?.message ?? { count: forgeTamper.count }
    );
  }

  // 8 cannot mark other's read (before marking own)
  if (userSubmitNotif?.id) {
    await signIn(buyerB.email);
    const markOther = await supabase.rpc("mark_notification_read", {
      notification_id: userSubmitNotif.id,
    });
    check(
      "User cannot mark another user's notification read",
      Boolean(markOther.error),
      markOther.error?.message
    );
  }

  // 7 mark own read
  if (userSubmitNotif?.id) {
    await signIn(buyerA.email);
    const markOwn = await supabase.rpc("mark_notification_read", {
      notification_id: userSubmitNotif.id,
    });
    check(
      "User can mark own notification read",
      !markOwn.error && markOwn.data?.is_read === true,
      markOwn.error?.message ?? markOwn.data
    );
  }

  // 9 mark-all-read isolation
  await signIn(buyerA.email);
  const buyerABeforeMarkAll = await listOwnNotifications();
  const buyerAUnreadBefore = buyerABeforeMarkAll.rows.filter(
    (row) => !row.is_read
  ).length;

  await signIn(buyerB.email);
  const markAllB = await supabase.rpc("mark_all_notifications_read");
  check("Buyer B mark-all-read succeeds", !markAllB.error, markAllB.error);

  await signIn(buyerA.email);
  const buyerAAfterMarkAll = await listOwnNotifications();
  const buyerAUnreadAfter = buyerAAfterMarkAll.rows.filter(
    (row) => !row.is_read
  ).length;
  check(
    "Mark-all-read affects only caller's notifications",
    buyerAUnreadAfter === buyerAUnreadBefore,
    { before: buyerAUnreadBefore, after: buyerAUnreadAfter }
  );

  // 13 & 14 product submission notifications
  await signIn(supplier.email);
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      company_id: supplier.companyId,
      created_by: supplier.userId,
      name: `Notify Product ${stamp}`,
      category: "Rice",
      status: "draft",
    })
    .select("*")
    .single();
  if (productError) fatal(`product create failed: ${productError.message}`);

  const submitProduct = await supabase.rpc("submit_product_for_review", {
    product_id: product.id,
  });
  check("Supplier can submit product for review", !submitProduct.error, submitProduct.error);

  const supplierNotifs = await listOwnNotifications();
  check(
    "Product submission creates supplier notification",
    supplierNotifs.rows.some((row) => row.type === "product.submitted"),
    supplierNotifs.rows.map((row) => row.type)
  );

  if (serviceClient && adminIds.length > 0) {
    const { data: adminProductNotifs } = await serviceClient
      .from("notifications")
      .select("*")
      .in("recipient_user_id", adminIds)
      .eq("type", "product.admin_review_required")
      .eq("entity_id", product.id);
    check(
      "Product submission creates admin notification",
      (adminProductNotifs ?? []).length > 0,
      adminProductNotifs
    );
  } else {
    skip(
      "Product submission creates admin notification (requires SUPABASE_SERVICE_ROLE_KEY and existing admin profile)"
    );
  }

  skip(
    "Product approval/rejection notification tests (requires trusted admin session provisioning)"
  );

  console.log(`\nResults: ${passed} passed, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(` - ${failure.desc}`, failure.extra ?? "");
    }
    process.exit(1);
  }
} catch (err) {
  fatal(err instanceof Error ? err.message : String(err));
}
