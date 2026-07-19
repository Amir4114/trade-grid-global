import type { SupabaseClient } from "@supabase/supabase-js"

import type { Company, Database, UserRole } from "@/lib/database/types"

export type WorkspaceSummaryItem = {
  label: string
  value: number
}

type Client = SupabaseClient<Database>

function requireCount(
  result: { count: number | null; error: { message: string } | null },
  label: string
): number {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`)
  }
  return result.count ?? 0
}

async function unreadNotifications(supabase: Client) {
  return supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
}

export async function loadWorkspaceSummary(
  supabase: Client,
  role: UserRole,
  company: Company | null
): Promise<WorkspaceSummaryItem[]> {
  if (role === "admin") {
    const [verification, products, rfqs, notifications] = await Promise.all([
      supabase
        .from("verification_cases")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "in_review"]),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "quoted"]),
      unreadNotifications(supabase),
    ])

    return [
      {
        label: "Verification Queue",
        value: requireCount(verification, "verification queue"),
      },
      {
        label: "Product Reviews",
        value: requireCount(products, "product reviews"),
      },
      { label: "Active RFQs", value: requireCount(rfqs, "active RFQs") },
      {
        label: "Notifications",
        value: requireCount(notifications, "notifications"),
      },
    ]
  }

  if (!company) {
    return [
      { label: "Pending Actions", value: 1 },
      { label: "Notifications", value: 0 },
    ]
  }

  if (role === "buyer") {
    const [drafts, active, notifications] = await Promise.all([
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", company.id)
        .eq("status", "draft"),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("buyer_company_id", company.id)
        .in("status", ["open", "quoted"]),
      unreadNotifications(supabase),
    ])
    const pendingActions =
      Number(!company.onboarding_completed) +
      Number(
        company.verification_status === "pending" ||
          company.verification_status === "rejected"
      )

    return [
      { label: "Draft RFQs", value: requireCount(drafts, "draft RFQs") },
      { label: "Active RFQs", value: requireCount(active, "active RFQs") },
      {
        label: "Notifications",
        value: requireCount(notifications, "notifications"),
      },
      { label: "Pending Actions", value: pendingActions },
    ]
  }

  const [products, quotations, orders, notifications] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("quotation_threads")
      .select("id", { count: "exact", head: true })
      .eq("supplier_company_id", company.id)
      .eq("status", "draft"),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("supplier_company_id", company.id)
      .in("status", ["issued", "accepted"]),
    unreadNotifications(supabase),
  ])

  return [
    { label: "Products", value: requireCount(products, "products") },
    {
      label: "Draft Quotations",
      value: requireCount(quotations, "draft quotations"),
    },
    { label: "Active Orders", value: requireCount(orders, "active orders") },
    {
      label: "Notifications",
      value: requireCount(notifications, "notifications"),
    },
  ]
}
