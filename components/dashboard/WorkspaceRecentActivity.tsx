"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Activity } from "lucide-react"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import type { Company } from "@/lib/database/types"
import { createClient } from "@/lib/supabase/client"

type ActivityItem = {
  id: string
  title: string
  kind: string
  status: string
  updatedAt: string
  href: string
}

export function WorkspaceRecentActivity({
  role,
  company,
}: {
  role: "buyer" | "supplier"
  company: Company | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      if (!company) return []

      let primaryItems: ActivityItem[]
      if (role === "buyer") {
        const rfqs = await supabase
          .from("rfqs")
          .select("id,title,status,updated_at")
          .eq("buyer_company_id", company.id)
          .order("updated_at", { ascending: false })
          .limit(4)
        if (rfqs.error) throw new Error(rfqs.error.message)
        primaryItems = (rfqs.data ?? []).map((row) => ({
          id: `rfq-${row.id}`,
          title: row.title,
          kind: "RFQ",
          status: row.status,
          updatedAt: row.updated_at,
          href: `/dashboard/buyer/rfqs/${row.id}`,
        }))
      } else {
        const products = await supabase
          .from("products")
          .select("id,name,status,updated_at")
          .eq("company_id", company.id)
          .order("updated_at", { ascending: false })
          .limit(4)
        if (products.error) throw new Error(products.error.message)
        primaryItems = (products.data ?? []).map((row) => ({
          id: `product-${row.id}`,
          title: row.name,
          kind: "Product",
          status: row.status,
          updatedAt: row.updated_at,
          href: `/dashboard/supplier/products/${row.id}/edit`,
        }))
      }
      const orders = await supabase
        .from("purchase_orders")
        .select("id,po_number,product_name,status,updated_at")
        .eq(
          role === "buyer" ? "buyer_company_id" : "supplier_company_id",
          company.id
        )
        .order("updated_at", { ascending: false })
        .limit(4)

      if (orders.error) throw new Error(orders.error.message)

      const orderItems: ActivityItem[] = (orders.data ?? []).map((row) => ({
        id: `order-${row.id}`,
        title: `${row.po_number} · ${row.product_name}`,
        kind: "Order",
        status: row.status,
        updatedAt: row.updated_at,
        href: `/dashboard/${role}/orders/${row.id}`,
      }))

      return [...primaryItems, ...orderItems]
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
        )
        .slice(0, 6)
    }

    void load()
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {
        if (active) setError(true)
      })

    return () => {
      active = false
    }
  }, [company, role, supabase])

  return (
    <DashboardPanel
      title="Recent Activity"
      description="Your latest workspace records, ordered by update time."
    >
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Recent activity is temporarily unavailable.
        </p>
      ) : items === null ? (
        <div className="space-y-3" aria-label="Loading recent activity">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-lg bg-neutral-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center">
          <Activity className="mx-auto size-6 text-neutral-400" />
          <p className="mt-3 text-sm font-medium">No recent activity</p>
          <p className="mt-1 text-xs text-neutral-500">
            New RFQs, products, and orders will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md outline-none hover:text-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{item.kind}</p>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {item.status.replaceAll("_", " ")}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
