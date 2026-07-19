// Verification operations verification (migration 013).
//
// Run AFTER migration 013 is manually applied:
//   node --use-system-ca scripts/verify-verification-operations.mjs

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { seedRequiredCompanyDocuments } from "./helpers/company-documents.mjs"

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

async function signIn(email) {
  await supabase.auth.signOut()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

async function assertMigration013Applied() {
  const probe = await supabase.from("verification_cases").select("id").limit(1)
  if (probe.error?.message?.includes("Could not find the table")) {
    console.error(
      "\nMigration 013 is NOT applied yet (verification_cases missing).\n" +
        "Apply manually: supabase/migrations/013_verification_operations_foundation.sql\n"
    )
    process.exit(2)
  }
  if (probe.error && probe.error.code === "42P01") {
    console.error(
      "\nMigration 013 is NOT applied yet (verification_cases missing).\n" +
        "Apply manually: supabase/migrations/013_verification_operations_foundation.sql\n"
    )
    process.exit(2)
  }

  const evidenceProbe = await supabase
    .from("verification_case_documents")
    .select("case_id")
    .limit(1)
  if (evidenceProbe.error) {
    console.error(
      "\nMigration 020 is NOT applied yet (case evidence table missing).\n" +
        "Apply manually: supabase/migrations/020_verification_case_evidence_lock.sql\n"
    )
    process.exit(2)
  }
}

async function createSupplierWithCompany(suffix = "primary") {
  const email = `vops-supplier-${suffix}-${stamp}@tradegrid.test`
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authError) throw new Error(authError.message)
  const userId = authData.user?.id
  const writer = serviceClient ?? supabase

  await writer
    .from("profiles")
    .upsert({ id: userId, email, role: "supplier" }, { onConflict: "id" })
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `VOps Supplier ${suffix} ${stamp}`,
      country: "India",
      business_type: "Exporter",
      company_structure: "Private Limited Company",
      account_type: "supplier",
      verification_status: "pending",
      onboarding_completed: true,
    },
    { onConflict: "user_id" }
  )

  const { data: company } = await writer
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .single()

  await signIn(email)
  return { email, userId, company }
}

async function createAdmin() {
  if (!serviceClient) return null

  const email = `vops-admin-${stamp}@tradegrid.test`
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`admin creation failed: ${error.message}`)

  const userId = data.user?.id
  const { error: profileError } = await serviceClient
    .from("profiles")
    .upsert({ id: userId, email, role: "admin" }, { onConflict: "id" })
  if (profileError) {
    throw new Error(`admin profile failed: ${profileError.message}`)
  }

  return { email, userId }
}

async function createBuyerWithCompany() {
  const email = `vops-buyer-${stamp}@tradegrid.test`
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authError) throw new Error(authError.message)
  const userId = authData.user?.id
  const writer = serviceClient ?? supabase

  await writer
    .from("profiles")
    .upsert({ id: userId, email, role: "buyer" }, { onConflict: "id" })
  await writer.from("companies").upsert(
    {
      user_id: userId,
      company_name: `VOps Buyer ${stamp}`,
      country: "India",
      business_type: "Importer",
      company_structure: "Private Limited Company",
      account_type: "buyer",
      verification_status: "pending",
      onboarding_completed: true,
    },
    { onConflict: "user_id" }
  )

  await signIn(email)
  return { email, userId }
}

async function verifyOwnerCompanyInsertGuard() {
  const email = `vops-insert-guard-${stamp}@tradegrid.test`
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authError) throw new Error(authError.message)
  const userId = authData.user?.id

  await supabase
    .from("profiles")
    .upsert({ id: userId, email, role: "buyer" }, { onConflict: "id" })

  const seededTrust = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      company_name: `Insert Guard Buyer ${stamp}`,
      country: "India",
      business_type: "Importer",
      company_structure: "Private Limited Company",
      account_type: "buyer",
      verification_status: "verified",
      risk_score: 0,
      onboarding_completed: true,
    })
    .select("verification_status,risk_score")
    .single()
  check(
    "Owner company insert cannot seed verified status or trusted risk",
    !seededTrust.error &&
      seededTrust.data?.verification_status === "pending" &&
      seededTrust.data?.risk_score === 50,
    seededTrust.error?.message ?? seededTrust.data
  )

  const mismatchEmail = `vops-insert-mismatch-${stamp}@tradegrid.test`
  const { data: mismatchAuth, error: mismatchAuthError } =
    await supabase.auth.signUp({
      email: mismatchEmail,
      password,
    })
  if (mismatchAuthError) throw new Error(mismatchAuthError.message)
  const mismatchUserId = mismatchAuth.user?.id

  await supabase.from("profiles").upsert(
    {
      id: mismatchUserId,
      email: mismatchEmail,
      role: "buyer",
    },
    { onConflict: "id" }
  )
  const mismatchedCompany = await supabase.from("companies").insert({
    user_id: mismatchUserId,
    company_name: `Mismatched Buyer ${stamp}`,
    country: "India",
    account_type: "supplier",
  })
  check(
    "Owner company insert account type must match profile role",
    Boolean(mismatchedCompany.error),
    mismatchedCompany.error?.message
  )
}

async function verifyPendingDocumentManagement(supplier, buyer) {
  await signIn(supplier.email)

  const originalPath = `documents/${supplier.company.id}/replace-${stamp}.pdf`
  const replacementPath = `documents/${supplier.company.id}/replacement-${stamp}.pdf`
  const body = new TextEncoder().encode("%PDF-1.4\n% document management\n")

  const originalUpload = await supabase.storage
    .from("company-docs")
    .upload(originalPath, body, { contentType: "application/pdf" })
  if (originalUpload.error) throw new Error(originalUpload.error.message)

  const originalInsert = await supabase
    .from("documents")
    .insert({
      company_id: supplier.company.id,
      doc_type: "Food Safety Certification",
      document_name: "food-safety-original.pdf",
      file_url: originalPath,
      status: "pending",
    })
    .select("*")
    .single()
  if (originalInsert.error) throw new Error(originalInsert.error.message)

  const ownPreview = await supabase.storage
    .from("company-docs")
    .createSignedUrl(originalPath, 60)
  check(
    "Owner can create a short-lived document preview URL",
    !ownPreview.error && Boolean(ownPreview.data?.signedUrl),
    ownPreview.error?.message
  )

  await signIn(buyer.email)
  const foreignPreview = await supabase.storage
    .from("company-docs")
    .createSignedUrl(originalPath, 60)
  check(
    "Cross-company document preview is denied",
    Boolean(foreignPreview.error),
    foreignPreview.data
  )

  const foreignDelete = await supabase.storage
    .from("company-docs")
    .remove([originalPath])

  await signIn(supplier.email)
  const previewAfterForeignDelete = await supabase.storage
    .from("company-docs")
    .createSignedUrl(originalPath, 60)
  check(
    "Cross-company pending document deletion is denied",
    Boolean(foreignDelete.error) || !previewAfterForeignDelete.error,
    foreignDelete.error?.message ?? previewAfterForeignDelete.error?.message
  )

  const replacementUpload = await supabase.storage
    .from("company-docs")
    .upload(replacementPath, body, { contentType: "application/pdf" })
  if (replacementUpload.error) throw new Error(replacementUpload.error.message)

  const replacementInsert = await supabase.from("documents").insert({
    company_id: supplier.company.id,
    doc_type: "Food Safety Certification",
    document_name: "food-safety-replacement.pdf",
    file_url: replacementPath,
    status: "pending",
  })
  if (replacementInsert.error) throw new Error(replacementInsert.error.message)

  const removeOriginalFile = await supabase.storage
    .from("company-docs")
    .remove([originalPath])
  const removeOriginalMetadata = await supabase
    .from("documents")
    .delete()
    .eq("id", originalInsert.data.id)
    .select("id")
    .maybeSingle()
  check(
    "Owner can replace pending evidence using ordered file and metadata deletion",
    !removeOriginalFile.error &&
      !removeOriginalMetadata.error &&
      Boolean(removeOriginalMetadata.data),
    removeOriginalFile.error?.message ?? removeOriginalMetadata.error?.message
  )

  const unsupportedPath = `documents/${supplier.company.id}/unsupported-${stamp}.pdf`
  await supabase.storage
    .from("company-docs")
    .upload(unsupportedPath, body, { contentType: "application/pdf" })
  const unsupportedInsert = await supabase.from("documents").insert({
    company_id: supplier.company.id,
    doc_type: "Certification Document",
    document_name: "unsupported.pdf",
    file_url: unsupportedPath,
    status: "pending",
  })
  check(
    "Non-canonical company document types remain blocked",
    Boolean(unsupportedInsert.error),
    unsupportedInsert.data
  )
  await supabase.storage.from("company-docs").remove([unsupportedPath])
}

try {
  await assertMigration013Applied()
  check("Migrations 013 and 020 verification tables reachable", true)

  await verifyOwnerCompanyInsertGuard()
  const supplier = await createSupplierWithCompany()
  const buyer = await createBuyerWithCompany()
  const admin = await createAdmin()

  const supplierInsertCase = await supabase.from("verification_cases").insert({
    case_type: "company_verification",
    entity_id: supplier.company.id,
    status: "pending",
    priority: "normal",
    submitted_at: new Date().toISOString(),
    sla_due_at: new Date(Date.now() + 86400000).toISOString(),
    source: "user_submission",
  })

  check(
    "Supplier cannot create arbitrary verification cases",
    Boolean(supplierInsertCase.error),
    supplierInsertCase.error?.message
  )

  await signIn(buyer.email)
  const buyerInsertCase = await supabase.from("verification_cases").insert({
    case_type: "company_verification",
    entity_id: supplier.company.id,
    status: "pending",
    priority: "normal",
    submitted_at: new Date().toISOString(),
    sla_due_at: new Date(Date.now() + 86400000).toISOString(),
    source: "user_submission",
  })

  check(
    "Buyer cannot create arbitrary verification cases",
    Boolean(buyerInsertCase.error),
    buyerInsertCase.error?.message
  )

  await signIn(supplier.email)
  const { data: casesBefore } = await supabase
    .from("verification_cases")
    .select("id")
    .eq("case_type", "company_verification")
    .eq("entity_id", supplier.company.id)

  check(
    "Supplier cannot read verification cases directly",
    Boolean(casesBefore?.length === 0 || casesBefore === null),
    casesBefore
  )

  const documentlessSubmit = await supabase.rpc(
    "submit_company_for_verification",
    {
      company_id: supplier.company.id,
    }
  )
  check(
    "Company submission without required evidence is blocked",
    Boolean(documentlessSubmit.error),
    documentlessSubmit.error?.message
  )

  await seedRequiredCompanyDocuments(
    supabase,
    supplier.company.id,
    `verification-${stamp}`
  )
  await verifyPendingDocumentManagement(supplier, buyer)

  const submitCompany = await supabase.rpc("submit_company_for_verification", {
    company_id: supplier.company.id,
  })

  check(
    "Company submission succeeds",
    !submitCompany.error &&
      submitCompany.data?.verification_status === "under_review",
    submitCompany.error?.message ?? submitCompany.data
  )

  const { data: submittedEvidence } = await supabase
    .from("documents")
    .select("file_url")
    .eq("company_id", supplier.company.id)
    .eq("doc_type", "Trade License")
    .eq("status", "pending")
    .single()
  const caseLinkedDelete = submittedEvidence
    ? await supabase.storage
        .from("company-docs")
        .remove([submittedEvidence.file_url])
    : { error: new Error("Submitted evidence was not found.") }
  const caseLinkedPreview = submittedEvidence
    ? await supabase.storage
        .from("company-docs")
        .createSignedUrl(submittedEvidence.file_url, 60)
    : { error: new Error("Submitted evidence was not found.") }
  check(
    "Case-linked evidence file deletion is denied",
    Boolean(caseLinkedDelete.error) || !caseLinkedPreview.error,
    caseLinkedDelete.error?.message ?? caseLinkedPreview.error?.message
  )

  if (serviceClient) {
    const { data: adminCases } = await serviceClient
      .from("verification_cases")
      .select("*")
      .eq("case_type", "company_verification")
      .eq("entity_id", supplier.company.id)
      .in("status", ["pending", "in_review"])

    check(
      "Company submission creates active verification case",
      (adminCases ?? []).length === 1,
      adminCases
    )

    const caseId = adminCases?.[0]?.id
    const { data: events } = await serviceClient
      .from("verification_case_events")
      .select("*")
      .eq("case_id", caseId)
      .eq("event_type", "case.submitted")

    check(
      "Company submission creates submitted audit event",
      (events ?? []).length >= 1,
      events
    )

    const dupSubmit = await supabase.rpc("submit_company_for_verification", {
      company_id: supplier.company.id,
    })

    check(
      "Duplicate submit blocked while under_review",
      Boolean(dupSubmit.error),
      dupSubmit.error?.message
    )

    const { data: casesAfterDup } = await serviceClient
      .from("verification_cases")
      .select("id")
      .eq("case_type", "company_verification")
      .eq("entity_id", supplier.company.id)
      .in("status", ["pending", "in_review"])

    check(
      "No duplicate active company case created",
      (casesAfterDup ?? []).length === 1,
      casesAfterDup
    )
  } else {
    skip("Company case/event assertions", "requires SUPABASE_SERVICE_ROLE_KEY")
    skip(
      "Duplicate active case assertion",
      "requires SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  await signIn(supplier.email)
  const startReview = await supabase.rpc("start_verification_case_review", {
    p_case_id: "00000000-0000-0000-0000-000000000001",
  })

  check(
    "Non-admin cannot start review",
    Boolean(startReview.error),
    startReview.error?.message
  )

  const setPriority = await supabase.rpc("set_verification_case_priority", {
    p_case_id: "00000000-0000-0000-0000-000000000001",
    p_priority: "urgent",
  })

  check(
    "Supplier cannot change case priority",
    Boolean(setPriority.error),
    setPriority.error?.message
  )

  const fakeEvent = await supabase.from("verification_case_events").insert({
    case_id: "00000000-0000-0000-0000-000000000001",
    event_type: "case.approved",
    actor_type: "user",
  })

  check(
    "Supplier cannot create fake audit events",
    Boolean(fakeEvent.error),
    fakeEvent.error?.message
  )

  const fakeAssessment = await supabase
    .from("verification_assessments")
    .insert({
      case_id: "00000000-0000-0000-0000-000000000001",
      assessor_type: "ai",
      assessor_name: "Fake AI",
      assessment_type: "document_completeness",
      result: "pass",
    })

  check(
    "Supplier cannot create fake AI assessments",
    Boolean(fakeAssessment.error),
    fakeAssessment.error?.message
  )

  const selfApproveCompany = await supabase.rpc(
    "approve_company_verification",
    {
      p_company_id: supplier.company.id,
    }
  )

  check(
    "Supplier cannot approve company verification",
    Boolean(selfApproveCompany.error),
    selfApproveCompany.error?.message
  )

  if (serviceClient && admin) {
    await signIn(admin.email)

    const { data: pendingCase, error: pendingCaseError } = await supabase
      .from("verification_cases")
      .select("*")
      .eq("case_type", "company_verification")
      .eq("entity_id", supplier.company.id)
      .eq("status", "pending")
      .single()
    check(
      "Admin can read the submitted company case",
      !pendingCaseError && Boolean(pendingCase?.id),
      pendingCaseError?.message
    )

    const directAdminDecision = await supabase
      .from("companies")
      .update({ verification_status: "verified" })
      .eq("id", supplier.company.id)
      .select("verification_status")
      .single()
    check(
      "Admin cannot bypass verification decision RPCs",
      Boolean(directAdminDecision.error),
      directAdminDecision.error?.message ?? directAdminDecision.data
    )

    const prematureApproval = await supabase.rpc(
      "approve_company_verification",
      { p_company_id: supplier.company.id }
    )
    check(
      "Company approval is blocked before review starts",
      Boolean(prematureApproval.error),
      prematureApproval.error?.message
    )

    const startCompanyReview = await supabase.rpc(
      "start_verification_case_review",
      { p_case_id: pendingCase.id }
    )
    check(
      "Admin can start company review",
      !startCompanyReview.error &&
        startCompanyReview.data?.status === "in_review",
      startCompanyReview.error?.message ?? startCompanyReview.data
    )

    const approveCompany = await supabase.rpc("approve_company_verification", {
      p_company_id: supplier.company.id,
    })
    check(
      "Admin can approve an in-review company without changing risk",
      !approveCompany.error &&
        approveCompany.data?.verification_status === "verified" &&
        approveCompany.data?.risk_score === 50,
      approveCompany.error?.message ?? approveCompany.data
    )

    const { data: approvedEvidence } = await serviceClient
      .from("verification_case_documents")
      .select("document_id, documents(status)")
      .eq("case_id", pendingCase.id)
    check(
      "Approval records case evidence and approves pending documents",
      (approvedEvidence ?? []).length >= 2 &&
        approvedEvidence.every((item) => item.documents?.status === "approved"),
      approvedEvidence
    )

    const rejectedSupplier = await createSupplierWithCompany("rejection")
    await seedRequiredCompanyDocuments(
      supabase,
      rejectedSupplier.company.id,
      `verification-reject-${stamp}`
    )
    const rejectedSubmit = await supabase.rpc(
      "submit_company_for_verification",
      { company_id: rejectedSupplier.company.id }
    )
    check(
      "Second company can submit for rejection-path testing",
      !rejectedSubmit.error,
      rejectedSubmit.error?.message
    )

    await signIn(admin.email)
    const { data: rejectionCase } = await supabase
      .from("verification_cases")
      .select("*")
      .eq("case_type", "company_verification")
      .eq("entity_id", rejectedSupplier.company.id)
      .eq("status", "pending")
      .single()

    await supabase.rpc("start_verification_case_review", {
      p_case_id: rejectionCase.id,
    })

    const blankRejection = await supabase.rpc("reject_company_verification", {
      p_company_id: rejectedSupplier.company.id,
      p_reason: "   ",
    })
    check(
      "Blank company rejection reason is blocked",
      Boolean(blankRejection.error),
      blankRejection.error?.message
    )

    const rejectCompany = await supabase.rpc("reject_company_verification", {
      p_company_id: rejectedSupplier.company.id,
      p_reason: "Replace the submitted registration evidence.",
    })
    check(
      "Admin can reject an in-review company with feedback",
      !rejectCompany.error &&
        rejectCompany.data?.verification_status === "rejected",
      rejectCompany.error?.message ?? rejectCompany.data
    )

    const { data: rejectedDocuments } = await serviceClient
      .from("documents")
      .select("status")
      .eq("company_id", rejectedSupplier.company.id)
    check(
      "Rejected case evidence becomes replaceable",
      (rejectedDocuments ?? []).length >= 2 &&
        rejectedDocuments.every((item) => item.status === "rejected"),
      rejectedDocuments
    )

    await signIn(rejectedSupplier.email)
    const feedback = await supabase.rpc("get_company_verification_feedback", {
      company_id: rejectedSupplier.company.id,
    })
    check(
      "Owner can read actionable rejection feedback",
      !feedback.error &&
        feedback.data === "Replace the submitted registration evidence.",
      feedback.error?.message ?? feedback.data
    )

    await seedRequiredCompanyDocuments(
      supabase,
      rejectedSupplier.company.id,
      `verification-resubmit-${stamp}`
    )
    const resubmit = await supabase.rpc("submit_company_for_verification", {
      company_id: rejectedSupplier.company.id,
    })
    check(
      "Owner can replace rejected evidence and resubmit",
      !resubmit.error && resubmit.data?.verification_status === "under_review",
      resubmit.error?.message ?? resubmit.data
    )

    const { data: resubmissionCases } = await serviceClient
      .from("verification_cases")
      .select("id,status")
      .eq("case_type", "company_verification")
      .eq("entity_id", rejectedSupplier.company.id)
      .order("submitted_at", { ascending: true })
    check(
      "Resubmission preserves the rejected case and creates a new case",
      (resubmissionCases ?? []).length === 2 &&
        resubmissionCases?.[0]?.status === "rejected" &&
        resubmissionCases?.[1]?.status === "pending",
      resubmissionCases
    )

    skip(
      "Product submission case tests",
      "requires supplier product fixture; run via verify-product-system"
    )
  } else {
    skip("Admin-positive tests", "requires SUPABASE_SERVICE_ROLE_KEY")
    skip("Product case creation tests", "requires SUPABASE_SERVICE_ROLE_KEY")
  }

  console.log(
    `\nResults: ${passed} passed, ${skipped} skipped, ${failures.length} failed`
  )
  if (failures.length > 0) process.exit(1)
} catch (err) {
  console.error("FATAL:", err instanceof Error ? err.message : err)
  process.exit(1)
}
