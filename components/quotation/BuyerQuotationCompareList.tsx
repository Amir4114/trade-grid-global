"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { listBuyerAllQuotationThreads } from "@/lib/quotation/service";
import {
  formatLeadTime,
  formatMoney,
  QUOTATION_THREAD_STATUS_LABELS,
  type QuotationThreadSummary,
} from "@/lib/quotation/types";
import { createClient } from "@/lib/supabase/client";

export default function BuyerQuotationCompareList() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<QuotationThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await listBuyerAllQuotationThreads(supabase);
        if (!active) return;
        setRows(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load quotations.");
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
      role="buyer"
      title="Quotations"
      description="Compare supplier pricing, lead times, and commercial terms across your RFQs."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/buyer/rfqs">My RFQs</Link>
        </Button>
      }
    >
      <DashboardPanel title="Received quotations">
        {error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold">No quotations yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Published RFQs will collect supplier offers here for comparison.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">RFQ</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Lead time</th>
                    <th className="px-4 py-3 font-semibold">Incoterm</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.rfq_title}</div>
                        <div className="text-xs text-neutral-500">
                          {row.rfq_product_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.supplier_company_name ?? row.supplier_company_id}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_offer ? formatMoney(row.current_offer) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_offer ? formatLeadTime(row.current_offer) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_offer?.incoterm || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {QUOTATION_THREAD_STATUS_LABELS[row.status]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/buyer/rfqs/${row.rfq_id}/quotations/${row.id}`}
                          >
                            Compare
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
