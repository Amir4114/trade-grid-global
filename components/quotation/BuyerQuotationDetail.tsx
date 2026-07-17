"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { getQuotationThreadDetail } from "@/lib/quotation/service";
import {
  formatLeadTime,
  formatMoney,
  QUOTATION_OFFER_STATUS_LABELS,
  QUOTATION_THREAD_STATUS_LABELS,
  type QuotationThreadDetail,
} from "@/lib/quotation/types";
import { createClient } from "@/lib/supabase/client";

export default function BuyerQuotationDetail() {
  const params = useParams<{ id: string; threadId: string }>();
  const threadId = params.threadId;
  const rfqId = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [detail, setDetail] = useState<QuotationThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await getQuotationThreadDetail(supabase, threadId);
        if (!active) return;
        setDetail(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load quotation.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, threadId]);

  if (loading) {
    return (
      <DashboardShell role="buyer" title="Quotation" description="Loading...">
        <p className="text-sm text-neutral-500">Loading quotation...</p>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="buyer" title="Quotation" description="Unavailable">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/dashboard/buyer/rfqs/${rfqId}`}>Back to RFQ</Link>
        </Button>
      </DashboardShell>
    );
  }

  const visibleOffers = detail.offers.filter((o) => o.status !== "draft");

  return (
    <DashboardShell
      role="buyer"
      title={detail.rfq.title}
      description={`Supplier quotation · ${QUOTATION_THREAD_STATUS_LABELS[detail.thread.status]}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/buyer/rfqs/${detail.rfq.id}`}>RFQ detail</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/buyer/quotations">All quotations</Link>
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        Use the RFQ compare table to award a supplier. This view shows commercial
        revision history for the selected thread.
        <div className="mt-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/buyer/rfqs/${detail.rfq.id}`}>
              Open compare & award
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardPanel title="Offer versions">
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Rev</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Price</th>
                  <th className="px-3 py-2 font-semibold">Lead time</th>
                  <th className="px-3 py-2 font-semibold">Incoterm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {visibleOffers
                  .slice()
                  .sort((a, b) => b.revision_no - a.revision_no)
                  .map((offer) => (
                    <tr key={offer.id}>
                      <td className="px-3 py-2">{offer.revision_no}</td>
                      <td className="px-3 py-2">
                        {QUOTATION_OFFER_STATUS_LABELS[offer.status]}
                      </td>
                      <td className="px-3 py-2">{formatMoney(offer)}</td>
                      <td className="px-3 py-2">{formatLeadTime(offer)}</td>
                      <td className="px-3 py-2">{offer.incoterm || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {visibleOffers[0] ? (
            <div className="mt-4 whitespace-pre-wrap text-sm text-neutral-700">
              <p className="font-medium text-neutral-900">Latest notes</p>
              <p className="mt-1">
                {[...visibleOffers]
                  .sort((a, b) => b.revision_no - a.revision_no)[0]?.notes || "—"}
              </p>
            </div>
          ) : null}
        </DashboardPanel>

        <DashboardPanel title="Timeline">
          <ul className="space-y-2 text-sm">
            {detail.events.map((event) => (
              <li key={event.id} className="border-b border-neutral-100 pb-2">
                <div className="font-medium">{event.event_type}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(event.created_at).toLocaleString()}
                </div>
                {event.message ? (
                  <div className="mt-1 text-neutral-600">{event.message}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
