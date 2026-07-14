import type { Company, CompanyDocument } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

export const COMPANY_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

export const COMPANY_DOCUMENT_MAX_SIZE = 5 * 1024 * 1024;

export function validateCompanyDocumentFile(file: File): string | null {
  if (!COMPANY_DOCUMENT_ALLOWED_TYPES.includes(file.type as (typeof COMPANY_DOCUMENT_ALLOWED_TYPES)[number])) {
    return "Only PDF, PNG, and JPG files are allowed.";
  }

  if (file.size > COMPANY_DOCUMENT_MAX_SIZE) {
    return "File size must be below 5MB.";
  }

  return null;
}

export function validateYearEstablished(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}$/.test(trimmed)) {
    return "Year established must be a four-digit year.";
  }

  const year = Number(trimmed);
  const currentYear = new Date().getFullYear();

  if (year < 1800 || year > currentYear) {
    return `Year established must be between 1800 and ${currentYear}.`;
  }

  return null;
}

export function validateOnboardingBusinessProfile(input: {
  businessType: string;
  companyStructure: string;
  categoryCount: number;
}): string | null {
  if (!input.businessType.trim()) {
    return "Please select a business type.";
  }

  if (!input.companyStructure.trim()) {
    return "Please select a company structure.";
  }

  if (input.categoryCount === 0) {
    return "Select at least one product category.";
  }

  return null;
}

export type BuyerOnboardingPayload = {
  business_type: string;
  company_structure: string;
  employee_count: string;
  annual_purchase_volume: string;
  categories: string[];
  target_markets: string[];
  required_certifications: string[];
  onboarding_step: string;
  onboarding_completed: boolean;
};

export type SupplierOnboardingPayload = {
  business_type: string;
  company_structure: string;
  employee_count: string;
  year_established: string;
  categories: string[];
  export_markets: string[];
  certifications: string[];
  onboarding_step: string;
  onboarding_completed: boolean;
};

async function getExistingCompany(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function saveBuyerOnboarding(
  userId: string,
  payload: BuyerOnboardingPayload
): Promise<Company> {
  const supabase = createClient();

  const company = await getExistingCompany(userId);

  if (!company) {
    throw new Error("Company profile not found.");
  }

  const { data, error } = await supabase
    .from("companies")
    .update({
      ...payload,
      account_type: "buyer",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function saveSupplierOnboarding(
  userId: string,
  payload: SupplierOnboardingPayload
): Promise<Company> {
  const supabase = createClient();

  const company = await getExistingCompany(userId);

  if (!company) {
    throw new Error("Company profile not found.");
  }

  const { data, error } = await supabase
    .from("companies")
    .update({
      ...payload,
      account_type: "supplier",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  docType: string
): Promise<void> {
  const supabase = createClient();

  if (!file) {
    throw new Error("No file selected.");
  }

  const fileError = validateCompanyDocumentFile(file);
  if (fileError) {
    throw new Error(fileError);
  }

  const cleanFileName = file.name.replace(/\s+/g, "-");
  const filePath = `documents/${companyId}/${Date.now()}-${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("company-docs")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: dbError } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      doc_type: docType,
      document_name: file.name,
      file_url: filePath,
      status: "pending",
    });

  if (dbError) {
    throw new Error(dbError.message);
  }
}

export async function fetchCompanyDocuments(
  companyId: string
): Promise<CompanyDocument[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function submitCompanyForVerification(
  companyId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("submit_company_for_verification", {
    company_id: companyId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminUsers() {
  const supabase = createClient();

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .order("created_at", {
      ascending: false,
    });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("user_id,company_name,verification_status");

  if (companyError) {
    throw new Error(companyError.message);
  }

  const companyMap = new Map(
    (companies ?? []).map((company) => [company.user_id, company])
  );

  return (profiles ?? []).map((profile) => {
    const company = companyMap.get(profile.id);

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
      company_name: company?.company_name ?? "-",
      verification_status: company?.verification_status ?? "pending",
    };
  });
}
