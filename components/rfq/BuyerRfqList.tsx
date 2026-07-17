"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/AuthProvider";
import { isOnboardingComplete } from "@/lib/auth/redirects";
import {
  listBuyerRfqs,
  statusTone,
  visibilityTone,
} from "@/lib/rfq/service";
import {
  formatQuantity,
  RFQ_STATUS_LABELS,
  RFQ_VISIBILITY_LABELS,
  type BuyerRfqListItem,
} from "@/lib/rfq/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BuyerRfqListPage() {
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<BuyerRfqListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onboardingComplete = isOnboardingComplete(company);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await listBuyerRfqs(supabase);
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
  }, [supabase]);

  return (
    <DashboardShell
      role="buyer"
      title="My RFQs"
      description="Create and manage buying requirements. Publish when ready for qualified suppliers."
      actions={
        <Button asChild disabled={!onboardingComplete}>
          <Link href="/dashboard/buyer/rfqs/new">
            <Plus className="size-4" />
            Create RFQ
          </Link>
        </Button>
      }
    >
      {!onboardingComplete ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete company onboarding before publishing RFQs. You can still save drafts after
          onboarding is finished.
        </div>
      ) : null}

      <DashboardPanel
        title="RFQ inventory"
        description="Draft, open, closed, and cancelled requests owned by your company."
      >
        {error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading RFQs...</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">No RFQs yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Create a draft buying request to start the Trade Grid sourcing workflow.
            </p>
            <Button asChild className="mt-4" disabled={!onboardingComplete}>
              <Link href="/dashboard/buyer/rfqs/new">Create RFQ</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">RFQ</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Visibility</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
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
                          {rfq.invite_count > 0 ? ` · ${rfq.invite_count} invites` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{rfq.category}</td>
                      <td className="px-4 py-3 text-neutral-700">{formatQuantity(rfq)}</td>
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
                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(rfq.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/buyer/rfqs/${rfq.id}`}>Open</Link>
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
