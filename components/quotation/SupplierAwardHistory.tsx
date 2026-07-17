"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { listSupplierAwards } from "@/lib/quotation/service";
import type { SupplierAwardSummary } from "@/lib/quotation/types";
import { createClient } from "@/lib/supabase/client";

export default function SupplierAwardHistory() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SupplierAwardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await listSupplierAwards(supabase);
        if (!active) return;
        setRows(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load awards.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <DashboardShell
      role="supplier"
      title="Awards"
      description="Award decisions on RFQs where your company submitted a quotation."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/supplier/quotations">Quotations</Link>
        </Button>
      }
    >
      <DashboardPanel title="Award history">
        {error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold">No awards yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              When a buyer awards your quotation, it will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <div className="font-medium text-neutral-900">{row.rfq_title}</div>
                  <div className="text-xs text-neutral-500">
                    {row.rfq_product_name} ·{" "}
                    {new Date(row.awarded_at).toLocaleString()} · {row.status}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/supplier/quotations/${row.thread_id}`}>
                      Open quotation
                    </Link>
                  </Button>
                  {row.status === "active" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/supplier/orders">Orders</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
