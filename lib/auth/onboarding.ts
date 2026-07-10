import type { Company, CompanyDocument } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

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

  const { error } = await supabase
    .from("companies")
    .update({
      verification_status: "under_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

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
