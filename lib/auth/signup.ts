import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database/types"

export type MarketplaceAccountType = "buyer" | "supplier"

type RecoverMarketplaceAccountInput = {
  supabase: SupabaseClient<Database>
  userId: string
  fullName: string
  companyName: string
  accountType: MarketplaceAccountType
}

export type MarketplaceAccountRecoveryResult =
  | {
      status: "recovered"
      role: MarketplaceAccountType
      accountType: MarketplaceAccountType
      onboardingCompleted: false
    }
  | {
      status: "already_provisioned"
    }

export async function recoverIncompleteMarketplaceAccount(
  input: RecoverMarketplaceAccountInput
): Promise<MarketplaceAccountRecoveryResult> {
  const { supabase, userId, fullName, companyName, accountType } = input

  // ----------------------------------------------------
  // VERIFY AUTH SESSION
  // ----------------------------------------------------

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!session) {
    throw new Error(
      "Authentication session not found. Please refresh the page and try again."
    )
  }

  if (!user) {
    throw new Error("Authenticated user not found.")
  }

  if (user.id !== userId) {
    throw new Error(
      `User mismatch.
JWT User: ${user.id}
Passed User: ${userId}`
    )
  }

  // ----------------------------------------------------
  // RECOVER LEGACY PARTIAL SIGNUP
  // ----------------------------------------------------

  const { data: company, error: recoveryError } = await supabase.rpc(
    "recover_incomplete_marketplace_account",
    {
      p_full_name: fullName,
      p_company_name: companyName,
      p_account_type: accountType,
    }
  )

  if (recoveryError?.code === "23505") {
    return { status: "already_provisioned" }
  }

  if (recoveryError) {
    throw new Error(
      `Marketplace account recovery failed.

Message: ${recoveryError.message}
Code: ${recoveryError.code ?? "Unknown"}`
    )
  }

  if (!company) {
    throw new Error("Recovered company was not returned.")
  }

  if (company.account_type !== accountType) {
    throw new Error(
      `Recovered company account type mismatch.

Expected: ${accountType}
Received: ${company.account_type}`
    )
  }

  return {
    status: "recovered",
    role: accountType,
    accountType,
    onboardingCompleted: false,
  }
}
