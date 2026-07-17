"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/contexts/AuthProvider";
import {
  listDiscoverableRfqs,
  statusTone,
  visibilityTone,
} from "@/lib/rfq/service";
import {
  formatQuantity,
  RFQ_CATEGORIES,
  RFQ_STATUS_LABELS,
  RFQ_VISIBILITY_LABELS,
  type SupplierRfqListItem,
} from "@/lib/rfq/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SupplierRfqDiscovery() {
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SupplierRfqListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await listDiscoverableRfqs(supabase, { q, category });
        if (!active) return;
        setRows(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load RFQs.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, q, category]);

  const verified = company?.verification_status === "verified";

  return (
    <DashboardShell
      role="supplier"
      title="RFQ discovery"
      description="Open buying requests you are eligible to view based on visibility and invites."
    >
      {!verified ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your company is not verified. You will only see public RFQs and RFQs that
          explicitly invite you. Verified-only demand stays hidden until verification
          completes.
        </div>
      ) : null}

      <DashboardPanel title="Discoverable RFQs">
        <div className="mb-5 grid gap-3 md:grid-cols-[1.4fr_0.6fr]">
          <Input
            placeholder="Search title, product, category, country"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {RFQ_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading RFQs...</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              No discoverable RFQs
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Eligible open requests will appear here when buyers publish demand.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">RFQ</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Country</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Visibility</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{rfq.title}</div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {rfq.product_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{rfq.category}</td>
                      <td className="px-4 py-3">{formatQuantity(rfq)}</td>
                      <td className="px-4 py-3">{rfq.target_country || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                            statusTone(rfq.status)
                          )}
                        >
                          {RFQ_STATUS_LABELS[rfq.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                            visibilityTone(rfq.visibility)
                          )}
                        >
                          {RFQ_VISIBILITY_LABELS[rfq.visibility]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/supplier/rfqs/${rfq.id}`}>View</Link>
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
