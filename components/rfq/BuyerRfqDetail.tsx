"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import RfqFormFields from "@/components/rfq/RfqFormFields";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/contexts/AuthProvider";
import { isOnboardingComplete } from "@/lib/auth/redirects";
import {
  cancelRfq,
  closeRfq,
  formValuesFromRfq,
  getRfqDetail,
  publishRfq,
  statusTone,
  updateDraftRfq,
  visibilityTone,
} from "@/lib/rfq/service";
import {
  canCancelRfq,
  canCloseRfq,
  canEditDraftRfq,
  canPublishRfq,
  formatQuantity,
  RFQ_STATUS_LABELS,
  RFQ_VISIBILITY_LABELS,
  type RfqDetail,
  type RfqFormValues,
} from "@/lib/rfq/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function BuyerRfqDetailPage() {
  const params = useParams<{ id: string }>();
  const rfqId = params.id;
  const router = useRouter();
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);

  const [detail, setDetail] = useState<RfqDetail | null>(null);
  const [values, setValues] = useState<RfqFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const onboardingComplete = isOnboardingComplete(company);

  const reload = async () => {
    const data = await getRfqDetail(supabase, rfqId);
    if (!data) {
      setDetail(null);
      setValues(null);
      return;
    }
    setDetail(data);
    setValues(formValuesFromRfq(data.rfq, data.invites));
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const data = await getRfqDetail(supabase, rfqId);
        if (!active) return;
        if (!data) {
          setError("RFQ not found or you do not have access.");
          setDetail(null);
          return;
        }
        setDetail(data);
        setValues(formValuesFromRfq(data.rfq, data.invites));
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

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      setBusy(true);
      setError(null);
      await action();
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
      <DashboardShell role="buyer" title="RFQ" description="Loading...">
        <p className="text-sm text-neutral-500">Loading RFQ detail...</p>
      </DashboardShell>
    );
  }

  if (!detail || !values) {
    return (
      <DashboardShell role="buyer" title="RFQ" description="Unavailable">
        <p className="text-sm text-red-600">{error ?? "RFQ not found."}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/buyer/rfqs">Back</Link>
        </Button>
      </DashboardShell>
    );
  }

  const { rfq } = detail;
  const editable = canEditDraftRfq(rfq);

  return (
    <DashboardShell
      role="buyer"
      title={rfq.title}
      description={`${rfq.product_name} · ${formatQuantity(rfq)}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/buyer/rfqs">All RFQs</Link>
          </Button>
          {canPublishRfq(rfq) ? (
            <Button
              disabled={busy || !onboardingComplete}
              onClick={() =>
                void runAction(() => publishRfq(supabase, rfq.id), "RFQ published.")
              }
            >
              Publish
            </Button>
          ) : null}
          {canCloseRfq(rfq) ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(() => closeRfq(supabase, rfq.id), "RFQ closed.")
              }
            >
              Close
            </Button>
          ) : null}
        </div>
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

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <DashboardPanel
          title={editable ? "Edit draft" : "RFQ details"}
          description={
            editable
              ? "Update specifications before publishing."
              : "Published RFQs are locked for editing in Phase A."
          }
        >
          <RfqFormFields
            values={values}
            onChange={setValues}
            disabled={!editable || busy}
          />
          {editable ? (
            <div className="mt-6">
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => updateDraftRfq(supabase, rfq.id, values),
                    "Draft updated."
                  )
                }
              >
                Save draft changes
              </Button>
            </div>
          ) : null}
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Lifecycle">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Created</dt>
                <dd>{new Date(rfq.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Published</dt>
                <dd>
                  {rfq.published_at
                    ? new Date(rfq.published_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Deadline</dt>
                <dd>
                  {rfq.quote_deadline_at
                    ? new Date(rfq.quote_deadline_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Target / port</dt>
                <dd>
                  {rfq.target_country || "—"}
                  {rfq.delivery_port ? ` · ${rfq.delivery_port}` : ""}
                </dd>
              </div>
            </dl>

            {canCancelRfq(rfq) ? (
              <div className="mt-6 space-y-3 border-t border-neutral-200 pt-4">
                <Input
                  placeholder="Cancellation reason (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={busy}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      await cancelRfq(supabase, rfq.id, cancelReason);
                      router.refresh();
                    }, "RFQ cancelled.")
                  }
                >
                  Cancel RFQ
                </Button>
              </div>
            ) : null}
          </DashboardPanel>

          <DashboardPanel title="Invites" description="Supplier companies invited to this RFQ.">
            {detail.invites.length === 0 ? (
              <p className="text-sm text-neutral-500">No invites.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {detail.invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <div className="font-medium text-neutral-900">
                      {invite.supplier_company_id}
                    </div>
                    <div className="text-xs text-neutral-500">{invite.status}</div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>

          <DashboardPanel title="Audit timeline">
            {detail.events.length === 0 ? (
              <p className="text-sm text-neutral-500">No events yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {detail.events.map((event) => (
                  <li key={event.id} className="border-b border-neutral-100 pb-2">
                    <div className="font-medium text-neutral-900">{event.event_type}</div>
                    <div className="text-xs text-neutral-500">
                      {new Date(event.created_at).toLocaleString()}
                      {event.from_status && event.to_status
                        ? ` · ${event.from_status} → ${event.to_status}`
                        : ""}
                    </div>
                    {event.message ? (
                      <div className="mt-1 text-neutral-600">{event.message}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardShell>
  );
}
