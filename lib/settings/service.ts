import type { SupabaseClient } from "@supabase/supabase-js";

import type { Company, Database, Profile } from "@/lib/database/types";
import { requiresReverification } from "@/lib/settings/policy";
import type {
  AccountSettingsInput,
  BuyerCompanySettingsInput,
  SettingsSaveResult,
  SupplierCompanySettingsInput,
} from "@/lib/settings/types";

type Client = SupabaseClient<Database>;

function assertUpdatedRow<T>(
  data: T | null,
  error: { message: string } | null,
  label: string
): T {
  if (error) {
    throw new Error(`${label} failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `${label} did not persist. No row was updated — check authorization or try again.`
    );
  }

  return data;
}

export async function updateAccountSettings(
  supabase: Client,
  userId: string,
  input: AccountSettingsInput
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim() || null,
    })
    .eq("id", userId)
    .select("*")
    .single();

  return assertUpdatedRow(data, error, "Account settings update");
}

export async function requestLoginEmailChange(
  supabase: Client,
  nextEmail: string
): Promise<void> {
  const trimmed = nextEmail.trim();
  if (!trimmed) {
    throw new Error("Enter a valid email address.");
  }

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSupplierCompanySettings(
  supabase: Client,
  userId: string,
  currentCompany: Company,
  input: SupplierCompanySettingsInput
): Promise<SettingsSaveResult> {
  const sensitiveChange = requiresReverification(currentCompany, {
    company_name: input.companyName,
    country: input.country,
  });

  const payload = {
    company_name: input.companyName.trim(),
    country: input.country.trim(),
    business_type: input.businessType.trim(),
    company_structure: input.companyStructure.trim(),
    year_established: input.yearEstablished.trim() || null,
    employee_count: input.employeeCount.trim() || null,
    categories: input.categories,
    export_markets: input.exportMarkets,
    certifications: input.certifications,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("companies")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  const company = assertUpdatedRow(data, error, "Company profile update");

  if (company.company_name !== payload.company_name) {
    throw new Error("Company name did not persist after save.");
  }

  if (company.country !== payload.country) {
    throw new Error("Country did not persist after save.");
  }

  return {
    profile: await fetchProfileOrThrow(supabase, userId),
    company,
    reverificationRequired:
      sensitiveChange &&
      company.verification_status === "pending" &&
      currentCompany.verification_status !== "pending",
  };
}

export async function updateBuyerCompanySettings(
  supabase: Client,
  userId: string,
  currentCompany: Company,
  input: BuyerCompanySettingsInput
): Promise<SettingsSaveResult> {
  const sensitiveChange = requiresReverification(currentCompany, {
    company_name: input.companyName,
    country: input.country,
  });

  const payload = {
    company_name: input.companyName.trim(),
    country: input.country.trim(),
    business_type: input.businessType.trim(),
    company_structure: input.companyStructure.trim(),
    employee_count: input.employeeCount.trim() || null,
    annual_purchase_volume: input.annualPurchaseVolume.trim() || null,
    categories: input.categories,
    target_markets: input.targetMarkets,
    required_certifications: input.requiredCertifications,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("companies")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  const company = assertUpdatedRow(data, error, "Company profile update");

  if (company.country !== payload.country) {
    throw new Error("Country did not persist after save.");
  }

  return {
    profile: await fetchProfileOrThrow(supabase, userId),
    company,
    reverificationRequired:
      sensitiveChange &&
      company.verification_status === "pending" &&
      currentCompany.verification_status !== "pending",
  };
}

async function fetchProfileOrThrow(
  supabase: Client,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return assertUpdatedRow(data, error, "Profile reload");
}