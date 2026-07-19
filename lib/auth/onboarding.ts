import type { Company, CompanyDocument, Profile } from "@/lib/database/types"
import {
  isCompanyDocumentType,
  type CompanyDocumentType,
} from "@/lib/document-options"
import { createClient } from "@/lib/supabase/client"

export const COMPANY_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const

export const COMPANY_DOCUMENT_MAX_SIZE = 5 * 1024 * 1024

export function validateCompanyDocumentFile(file: File): string | null {
  if (
    !COMPANY_DOCUMENT_ALLOWED_TYPES.includes(
      file.type as (typeof COMPANY_DOCUMENT_ALLOWED_TYPES)[number]
    )
  ) {
    return "Only PDF, PNG, and JPG files are allowed."
  }

  if (file.size > COMPANY_DOCUMENT_MAX_SIZE) {
    return "File size must be below 5MB."
  }

  return null
}

export function validateYearEstablished(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (!/^\d{4}$/.test(trimmed)) {
    return "Year established must be a four-digit year."
  }

  const year = Number(trimmed)
  const currentYear = new Date().getFullYear()

  if (year < 1800 || year > currentYear) {
    return `Year established must be between 1800 and ${currentYear}.`
  }

  return null
}

export function validateOnboardingBusinessProfile(input: {
  businessType: string
  companyStructure: string
  categoryCount: number
}): string | null {
  if (!input.businessType.trim()) {
    return "Please select a business type."
  }

  if (!input.companyStructure.trim()) {
    return "Please select a company structure."
  }

  if (input.categoryCount === 0) {
    return "Select at least one product category."
  }

  return null
}

export type BuyerOnboardingPayload = {
  email: string
  full_name: string
  company_name: string
  country: string
  business_type: string
  company_structure: string
  employee_count: string
  annual_purchase_volume: string
  categories: string[]
  target_markets: string[]
  required_certifications: string[]
  onboarding_step: string
  onboarding_completed: boolean
}

export type BuyerOnboardingResult = {
  profile: Profile
  company: Company
}

export type SupplierOnboardingPayload = {
  email: string
  full_name: string
  company_name: string
  country: string
  business_type: string
  company_structure: string
  employee_count: string
  year_established: string
  categories: string[]
  export_markets: string[]
  certifications: string[]
  onboarding_step: string
  onboarding_completed: boolean
}

async function getExistingCompany(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function saveBuyerOnboarding(
  userId: string,
  payload: BuyerOnboardingPayload
): Promise<BuyerOnboardingResult> {
  const supabase = createClient()

  const [
    {
      data: { user },
      error: userError,
    },
    existingProfileResult,
    existingCompanyResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase
      .from("companies")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (userError || !user) {
    throw new Error("Your session could not be verified. Please sign in again.")
  }

  if (user.id !== userId) {
    throw new Error(
      "The onboarding account does not match your signed-in user."
    )
  }

  if (existingProfileResult.error) {
    throw new Error(
      `Buyer profile lookup failed: ${existingProfileResult.error.message}`
    )
  }

  if (existingCompanyResult.error) {
    throw new Error(
      `Buyer company lookup failed: ${existingCompanyResult.error.message}`
    )
  }

  if (
    existingProfileResult.data?.role &&
    existingProfileResult.data.role !== "buyer"
  ) {
    throw new Error("This account is not registered as a buyer.")
  }

  if (
    existingCompanyResult.data?.account_type &&
    existingCompanyResult.data.account_type !== "buyer"
  ) {
    throw new Error("This company is not registered as a buyer organization.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: payload.email,
        full_name: payload.full_name.trim() || null,
        role: "buyer",
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (profileError) {
    throw new Error(`Buyer profile creation failed: ${profileError.message}`)
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .upsert(
      {
        user_id: userId,
        company_name: payload.company_name.trim(),
        country: payload.country.trim(),
        business_type: payload.business_type,
        company_structure: payload.company_structure,
        employee_count: payload.employee_count,
        annual_purchase_volume: payload.annual_purchase_volume,
        categories: payload.categories,
        target_markets: payload.target_markets,
        required_certifications: payload.required_certifications,
        onboarding_step: payload.onboarding_step,
        onboarding_completed: payload.onboarding_completed,
        account_type: "buyer",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (companyError) {
    throw new Error(`Buyer company creation failed: ${companyError.message}`)
  }

  return { profile, company }
}

export async function saveSupplierOnboarding(
  userId: string,
  payload: SupplierOnboardingPayload
): Promise<Company> {
  const supabase = createClient()

  const company = await getExistingCompany(userId)

  if (!company) {
    throw new Error("Company profile not found.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: payload.email,
        full_name: payload.full_name.trim() || null,
        role: "supplier",
      },
      { onConflict: "id" }
    )
    .select("role")
    .single()

  if (profileError) {
    throw new Error(`Supplier profile update failed: ${profileError.message}`)
  }

  if (profile.role !== "supplier") {
    throw new Error("This account is not registered as a supplier.")
  }

  const { data, error } = await supabase
    .from("companies")
    .update({
      company_name: payload.company_name.trim(),
      country: payload.country.trim(),
      business_type: payload.business_type,
      company_structure: payload.company_structure,
      employee_count: payload.employee_count,
      year_established: payload.year_established,
      categories: payload.categories,
      export_markets: payload.export_markets,
      certifications: payload.certifications,
      onboarding_step: payload.onboarding_step,
      onboarding_completed: payload.onboarding_completed,
      account_type: "supplier",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  docType: CompanyDocumentType
): Promise<CompanyDocument> {
  const supabase = createClient()

  if (!file) {
    throw new Error("No file selected.")
  }

  const fileError = validateCompanyDocumentFile(file)
  if (fileError) {
    throw new Error(fileError)
  }

  if (!isCompanyDocumentType(docType)) {
    throw new Error("Unsupported company document type.")
  }

  const cleanFileName = file.name.replace(/\s+/g, "-")
  const filePath = `documents/${companyId}/${Date.now()}-${cleanFileName}`

  const { error: uploadError } = await supabase.storage
    .from("company-docs")
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      doc_type: docType,
      document_name: file.name,
      file_url: filePath,
      status: "pending",
    })
    .select("*")
    .single()

  if (dbError) {
    const { error: cleanupError } = await supabase.storage
      .from("company-docs")
      .remove([filePath])

    if (cleanupError) {
      console.error("Failed to remove orphaned company document:", cleanupError)
    }

    throw new Error(dbError.message)
  }

  return document
}

export async function fetchCompanyDocuments(
  companyId: string
): Promise<CompanyDocument[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createCompanyDocumentPreviewUrl(
  document: Pick<CompanyDocument, "file_url">
): Promise<string> {
  if (!document.file_url.startsWith("documents/")) {
    throw new Error("Invalid company document storage path.")
  }

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("company-docs")
    .createSignedUrl(document.file_url, 5 * 60)

  if (error) {
    throw new Error(`Unable to preview document: ${error.message}`)
  }

  return data.signedUrl
}

export async function deletePendingCompanyDocument(
  document: CompanyDocument
): Promise<void> {
  if (document.status !== "pending") {
    throw new Error("Only pending documents can be deleted.")
  }

  if (!document.file_url.startsWith(`documents/${document.company_id}/`)) {
    throw new Error("Invalid company document storage path.")
  }

  const supabase = createClient()
  const { error: storageError } = await supabase.storage
    .from("company-docs")
    .remove([document.file_url])

  if (storageError) {
    throw new Error(`Unable to delete document file: ${storageError.message}`)
  }

  const { data, error: metadataError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("company_id", document.company_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (metadataError || !data) {
    throw new Error(
      "The file was removed, but its document record still needs cleanup. Retry deletion."
    )
  }
}

export async function replacePendingCompanyDocument(
  document: CompanyDocument,
  replacement: File
): Promise<CompanyDocument> {
  if (document.status !== "pending") {
    throw new Error("Only pending documents can be replaced directly.")
  }

  const uploaded = await uploadCompanyDocument(
    document.company_id,
    replacement,
    document.doc_type
  )

  try {
    await deletePendingCompanyDocument(document)
  } catch (error) {
    try {
      await deletePendingCompanyDocument(uploaded)
    } catch (cleanupError) {
      console.error(
        "Failed to remove replacement after original delete failed:",
        cleanupError
      )
    }
    throw error
  }

  return uploaded
}

export async function fetchCompanyVerificationFeedback(
  companyId: string
): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(
    "get_company_verification_feedback",
    { company_id: companyId }
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function submitCompanyForVerification(
  companyId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc("submit_company_for_verification", {
    company_id: companyId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchAdminUsers() {
  const supabase = createClient()

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .order("created_at", {
      ascending: false,
    })

  if (profileError) {
    throw new Error(profileError.message)
  }

  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("user_id,company_name,verification_status")

  if (companyError) {
    throw new Error(companyError.message)
  }

  const companyMap = new Map(
    (companies ?? []).map((company) => [company.user_id, company])
  )

  return (profiles ?? []).map((profile) => {
    const company = companyMap.get(profile.id)

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
      company_name: company?.company_name ?? "-",
      verification_status: company?.verification_status ?? "pending",
    }
  })
}
