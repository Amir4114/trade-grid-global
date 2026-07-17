"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PurchaseOrderStatusBadge from "@/components/purchase-orders/PurchaseOrderStatusBadge";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/database/types";
import { listPurchaseOrders } from "@/lib/purchase-orders/service";
import { formatPoMoney, formatPoQuantity } from "@/lib/purchase-orders/types";
import { createClient } from "@/lib/supabase/client";

const FILTERS: Array<{ label: string; value: PurchaseOrderStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Pending supplier", value: "issued" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

export default function BuyerPurchaseOrderList() {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const result = await listPurchaseOrders(supabase, {
          status: filter === "all" ? null : filter,
        });
        if (!active) return;
        setRows(result.rows);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load purchase orders."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, filter]);

  return (
    <DashboardShell
      role="buyer"
      title="Orders"
      description="Purchase orders issued from awarded quotations. Commercial terms are snapshotted at create and locked after issue."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/buyer/rfqs">My RFQs</Link>
        </Button>
      }
    >
      <DashboardPanel title="Purchase orders">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={
                filter === item.value
                  ? "rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1 text-xs font-medium text-white"
                  : "rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold">No purchase orders yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Create a purchase order from an awarded RFQ to commit commercial
              terms with the selected supplier.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {row.po_number}
                    </span>
                    <PurchaseOrderStatusBadge status={row.status} />
                  </div>
                  <div className="mt-1 text-sm text-neutral-700">
                    {row.product_name} · {row.supplier_company_name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatPoQuantity(row.quantity_value, row.quantity_unit)} ·{" "}
                    {formatPoMoney(row.total_price, row.currency)} · Updated{" "}
                    {new Date(row.updated_at).toLocaleString()}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/buyer/orders/${row.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
