"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import QuotationFormFields from "@/components/quotation/QuotationFormFields";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  getQuotationThreadDetail,
  pickCurrentOffer,
  reviseQuotation,
  submitQuotation,
  updateDraftQuotation,
  withdrawQuotation,
} from "@/lib/quotation/service";
import {
  EMPTY_QUOTATION_FORM,
  formatLeadTime,
  formatMoney,
  formValuesFromOffer,
  QUOTATION_OFFER_STATUS_LABELS,
  QUOTATION_THREAD_STATUS_LABELS,
  type QuotationFormValues,
  type QuotationThreadDetail,
} from "@/lib/quotation/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export default function SupplierQuotationDetail() {
  const params = useParams<{ id: string }>();
  const threadId = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [detail, setDetail] = useState<QuotationThreadDetail | null>(null);
  const [values, setValues] = useState<QuotationFormValues>(EMPTY_QUOTATION_FORM);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const data = await getQuotationThreadDetail(supabase, threadId);
    setDetail(data);
    const offer = pickCurrentOffer(data.offers);
    if (offer) setValues(formValuesFromOffer(offer));
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await getQuotationThreadDetail(supabase, threadId);
        if (!active) return;
        setDetail(data);
        const offer = pickCurrentOffer(data.offers);
        if (offer) setValues(formValuesFromOffer(offer));
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

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      setBusy(true);
      setError(null);
      await fn();
      await reload();
      toast.success(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="supplier" title="Quotation" description="Loading...">
        <p className="text-sm text-neutral-500">Loading quotation...</p>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="supplier" title="Quotation" description="Unavailable">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/supplier/quotations">Back</Link>
        </Button>
      </DashboardShell>
    );
  }

  const draft = detail.offers.find((o) => o.status === "draft");
  const submitted = detail.offers.find((o) => o.status === "submitted");
  const canEditDraft = Boolean(draft) && detail.thread.status !== "withdrawn";
  const canSubmitDraft = Boolean(draft);
  const canRevise = Boolean(submitted) && detail.thread.status === "active";
  const canWithdraw = detail.thread.status === "active" || detail.thread.status === "draft";

  return (
    <DashboardShell
      role="supplier"
      title={detail.rfq.title}
      description={`Quotation · ${QUOTATION_THREAD_STATUS_LABELS[detail.thread.status]}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/supplier/rfqs/${detail.rfq.id}`}>RFQ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/supplier/quotations">All quotations</Link>
          </Button>
        </div>
      }
    >
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {detail.thread.status === "awarded" ||
      detail.offers.some((o) => o.status === "awarded") ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Congratulations! Your quotation has been awarded.
          <div className="mt-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/supplier/awards">View award history</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {(detail.rfq.status === "awarded" ||
        detail.thread.status === "closed" ||
        detail.offers.some((o) => o.status === "not_selected")) &&
      detail.thread.status !== "awarded" &&
      !detail.offers.some((o) => o.status === "awarded") ? (
        <div className="mb-4 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          This RFQ has been awarded to another supplier.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardPanel
          title={draft ? "Draft offer" : canRevise ? "Create revision" : "Commercial terms"}
          description={
            draft
              ? "Update your draft, then submit to the buyer."
              : canRevise
                ? "Submitted offers are immutable. Revisions create a new version."
                : "Commercial history for this RFQ."
          }
        >
          <QuotationFormFields
            values={values}
            onChange={setValues}
            disabled={busy || (!canEditDraft && !canRevise)}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {canEditDraft ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => updateDraftQuotation(supabase, draft!.id, values),
                    "Draft saved."
                  )
                }
              >
                Save draft
              </Button>
            ) : null}
            {canSubmitDraft ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      submitQuotation(supabase, {
                        offerId: draft!.id,
                        values,
                      }),
                    "Quotation submitted."
                  )
                }
              >
                Submit quotation
              </Button>
            ) : null}
            {canRevise ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    () => reviseQuotation(supabase, detail.thread.id, values),
                    "Revision submitted."
                  )
                }
              >
                Submit revision
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => withdrawQuotation(supabase, detail.thread.id),
                    "Quotation withdrawn."
                  )
                }
              >
                Withdraw
              </Button>
            ) : null}
          </div>
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Version history">
            <ul className="space-y-3 text-sm">
              {detail.offers
                .slice()
                .sort((a, b) => b.revision_no - a.revision_no)
                .map((offer) => (
                  <li
                    key={offer.id}
                    className="rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <div className="font-medium">
                      Rev {offer.revision_no} · {QUOTATION_OFFER_STATUS_LABELS[offer.status]}
                    </div>
                    <div className="mt-1 text-neutral-600">
                      {formatMoney(offer)} · {formatLeadTime(offer)}
                    </div>
                  </li>
                ))}
            </ul>
          </DashboardPanel>

          <DashboardPanel title="Audit">
            <ul className="space-y-2 text-sm">
              {detail.events.map((event) => (
                <li key={event.id} className="border-b border-neutral-100 pb-2">
                  <div className="font-medium">{event.event_type}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </DashboardPanel>
        </div>
      </div>
    </DashboardShell>
  );
}
