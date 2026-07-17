"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  getRfqDetail,
  statusTone,
  visibilityTone,
} from "@/lib/rfq/service";
import {
  formatQuantity,
  RFQ_STATUS_LABELS,
  RFQ_VISIBILITY_LABELS,
  type RfqDetail,
} from "@/lib/rfq/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SupplierRfqDetail() {
  const params = useParams<{ id: string }>();
  const rfqId = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [detail, setDetail] = useState<RfqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await getRfqDetail(supabase, rfqId);
        if (!active) return;
        if (!data) {
          setError(
            "RFQ not found, or your company is not eligible to view this request."
          );
          setDetail(null);
          return;
        }
        setDetail(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load RFQ.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, rfqId]);

  if (loading) {
    return (
      <DashboardShell role="supplier" title="RFQ" description="Loading...">
        <p className="text-sm text-neutral-500">Loading RFQ...</p>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="supplier" title="RFQ" description="Unavailable">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/supplier/rfqs">Back to discovery</Link>
        </Button>
      </DashboardShell>
    );
  }

  const { rfq } = detail;

  return (
    <DashboardShell
      role="supplier"
      title={rfq.title}
      description={`${rfq.product_name} · ${formatQuantity(rfq)}`}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/supplier/rfqs">All RFQs</Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
            statusTone(rfq.status)
          )}
        >
          {RFQ_STATUS_LABELS[rfq.status]}
        </span>
        <span
          className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
            visibilityTone(rfq.visibility)
          )}
        >
          {RFQ_VISIBILITY_LABELS[rfq.visibility]}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardPanel title="Buying requirement">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Category</dt>
              <dd className="mt-1 font-medium">{rfq.category}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Quantity</dt>
              <dd className="mt-1 font-medium">{formatQuantity(rfq)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Target country</dt>
              <dd className="mt-1 font-medium">{rfq.target_country || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Delivery port</dt>
              <dd className="mt-1 font-medium">{rfq.delivery_port || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Packaging</dt>
              <dd className="mt-1 font-medium">
                {rfq.packaging_requirement || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Quote deadline</dt>
              <dd className="mt-1 font-medium">
                {rfq.quote_deadline_at
                  ? new Date(rfq.quote_deadline_at).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Certifications</dt>
              <dd className="mt-1 font-medium">
                {(rfq.required_certifications ?? []).join(", ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Incoterms</dt>
              <dd className="mt-1 font-medium">
                {(rfq.preferred_incoterms ?? []).join(", ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-neutral-800">
                {rfq.description || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-neutral-800">
                {rfq.notes || "—"}
              </dd>
            </div>
          </dl>
        </DashboardPanel>

        <DashboardPanel
          title="Quotation"
          description="Supplier quotations ship in Sprint 14.2. Review requirements now."
        >
          <p className="text-sm text-neutral-600">
            This RFQ is visible to your company under the current visibility rules.
            Quotation submission will be enabled in the next sprint.
          </p>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
