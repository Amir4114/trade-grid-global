import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

export type MarketplaceAccountType = "buyer" | "supplier";

type RegisterMarketplaceAccountInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  accountType: MarketplaceAccountType;
};

export type RegisteredMarketplaceAccount = {
  role: MarketplaceAccountType;
  accountType: MarketplaceAccountType;
  onboardingCompleted: false;
};

export async function registerMarketplaceAccount(
  input: RegisterMarketplaceAccountInput
): Promise<RegisteredMarketplaceAccount> {
  const {
    supabase,
    userId,
    email,
    fullName,
    companyName,
    accountType,
  } = input;

  // ----------------------------------------------------
  // VERIFY AUTH SESSION
  // ----------------------------------------------------

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!session) {
    throw new Error(
      "Authentication session not found. Please refresh the page and try again."
    );
  }

  if (!user) {
    throw new Error("Authenticated user not found.");
  }

  if (user.id !== userId) {
    throw new Error(
      `User mismatch.
JWT User: ${user.id}
Passed User: ${userId}`
    );
  }

  // ----------------------------------------------------
  // UPSERT PROFILE
  // ----------------------------------------------------

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName.trim() || null,
        role: accountType,
      },
      {
        onConflict: "id",
      }
    )
    .select()
    .single();

  if (profileError) {
    throw new Error(
      `Profile creation failed.

Message: ${profileError.message}
Code: ${profileError.code ?? "Unknown"}`
    );
  }

  if (!profile) {
    throw new Error("Profile was not returned after creation.");
  }

  if (profile.role !== accountType) {
    throw new Error(
      `Profile role mismatch.

Expected: ${accountType}
Received: ${profile.role}`
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .upsert(
      {
        user_id: userId,
        company_name: companyName,
        country: "",
        business_type: "",
        company_structure: "",
        verification_status: "pending",
        risk_score: 50,
        account_type: accountType,
        onboarding_completed: false,
        onboarding_step: "business_info",
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (companyError) {
    throw new Error(
      `Company creation failed.

Message: ${companyError.message}
Code: ${companyError.code ?? "Unknown"}`
    );
  }

  if (!company) {
    throw new Error("Company was not returned after creation.");
  }

  if (company.account_type !== accountType) {
    throw new Error(
      `Company account type mismatch.

Expected: ${accountType}
Received: ${company.account_type}`
    );
  }

  return {
    role: accountType,
    accountType,
    onboardingCompleted: false,
  };
}