"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
  CaseStatusBadge,
  CaseTypeBadge,
  PriorityBadge,
  SlaBadge,
} from "@/components/admin/verification/VerificationCaseBadges";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveCompanyVerification,
  approveProductViaCase,
  getVerificationCaseDetail,
  rejectCompanyVerification,
  rejectProductViaCase,
  setVerificationCasePriority,
  startVerificationCaseReview,
} from "@/lib/verification/service";
import {
  formatDateTime,
  formatWaitingDuration,
} from "@/lib/verification/sla";
import type {
  VerificationCaseDetail,
  VerificationCasePriority,
} from "@/lib/verification/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const PRIORITY_OPTIONS: VerificationCasePriority[] = [
  "urgent",
  "high",
  "normal",
  "low",
];

function eventLabel(eventType: string): string {
  switch (eventType) {
    case "case.submitted":
      return "Submitted for verification";
    case "case.refreshed":
      return "Submission refreshed";
    case "case.review_started":
      return "Review started";
    case "case.priority_changed":
      return "Priority changed";
    case "case.approved":
      return "Approved";
    case "case.rejected":
      return "Rejected";
    case "case.cancelled":
      return "Case cancelled";
    default:
      return eventType.replaceAll(".", " ");
  }
}

export default function VerificationCaseDetailView() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const caseId = params.id;

  const [detail, setDetail] = useState<VerificationCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const data = await getVerificationCaseDetail(supabase, caseId);
        if (!active) return;
        setDetail(data);
        setError(data ? null : "Verification case not found.");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load case.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, caseId, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const handleStartReview = async () => {
    if (!detail) return;
    try {
      setBusy(true);
      await startVerificationCaseReview(supabase, detail.case.id);
      toast.success("Review started");
      reload();
    } catch (err) {
      toast.error("Unable to start review", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePriorityChange = async (priority: VerificationCasePriority) => {
    if (!detail) return;
    try {
      setBusy(true);
      await setVerificationCasePriority(supabase, detail.case.id, priority);
      toast.success("Priority updated");
      reload();
    } catch (err) {
      toast.error("Unable to update priority", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      setBusy(true);
      if (detail.case.case_type === "company_verification") {
        await approveCompanyVerification(supabase, detail.case.entity_id, 0);
        toast.success("Company approved");
      } else if (detail.product) {
        await approveProductViaCase(supabase, detail.product.id);
        toast.success("Product approved");
      }
      reload();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      setBusy(true);
      if (detail.case.case_type === "company_verification") {
        await rejectCompanyVerification(
          supabase,
          detail.case.entity_id,
          rejectReason
        );
        toast.success("Company rejected");
      } else if (detail.product) {
        await rejectProductViaCase(supabase, detail.product.id, rejectReason);
        toast.success("Product rejected");
      }
      setRejectOpen(false);
      setRejectReason("");
      reload();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="admin" title="Case Review">
        <DashboardPanel>
          <p className="text-sm text-neutral-500">Loading case...</p>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="admin" title="Case Review">
        <DashboardPanel>
          <p className="text-sm text-red-600">{error ?? "Case not found."}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/dashboard/admin/verification">Back to queue</Link>
          </Button>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  const { case: reviewCase, company, product, documents, events, assessments } =
    detail;
  const canModerate =
    reviewCase.status === "pending" || reviewCase.status === "in_review";

  return (
    <DashboardShell
      role="admin"
      title="Case Review"
      description={`${reviewCase.case_type === "company_verification" ? company?.company_name : product?.name ?? "Review case"}`}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/verification">Back to queue</Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <DashboardPanel title="Case summary">
            <div className="flex flex-wrap gap-2">
              <CaseTypeBadge caseType={reviewCase.case_type} />
              <CaseStatusBadge status={reviewCase.status} />
              <PriorityBadge priority={reviewCase.priority} />
              <SlaBadge state={detail.sla_state} />
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatDateTime(reviewCase.submitted_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Waiting
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatWaitingDuration(reviewCase.submitted_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  SLA deadline
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {formatDateTime(reviewCase.sla_due_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Assigned reviewer
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {reviewCase.assigned_admin_id ?? "Unassigned"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {reviewCase.status === "pending" ? (
                <Button disabled={busy} onClick={() => void handleStartReview()}>
                  Start Review
                </Button>
              ) : null}
              {canModerate ? (
                <>
                  <Button disabled={busy} onClick={() => void handleApprove()}>
                    Approve
                  </Button>
                  <Button
                    disabled={busy}
                    variant="destructive"
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              <select
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
                value={reviewCase.priority}
                disabled={busy || !canModerate}
                onChange={(e) =>
                  void handlePriorityChange(
                    e.target.value as VerificationCasePriority
                  )
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Priority: {option}
                  </option>
                ))}
              </select>
            </div>
          </DashboardPanel>

          {reviewCase.case_type === "company_verification" && company ? (
            <DashboardPanel title="Company verification data">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Company
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{company.company_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Country
                  </dt>
                  <dd className="mt-1 text-sm">{company.country}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Business type
                  </dt>
                  <dd className="mt-1 text-sm">{company.business_type || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Verification status
                  </dt>
                  <dd className="mt-1 text-sm">{company.verification_status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Risk score
                  </dt>
                  <dd className="mt-1 text-sm">{company.risk_score}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Categories
                  </dt>
                  <dd className="mt-1 text-sm">
                    {company.categories.length > 0
                      ? company.categories.join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>

              {documents.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Verification documents
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <div className="font-medium">{doc.document_name}</div>
                        <div className="text-xs text-neutral-500">
                          {doc.doc_type} · {formatDateTime(doc.uploaded_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </DashboardPanel>
          ) : null}

          {reviewCase.case_type === "product_review" && product ? (
            <DashboardPanel title="Product review data">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Product
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Category
                  </dt>
                  <dd className="mt-1 text-sm">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Origin
                  </dt>
                  <dd className="mt-1 text-sm">{product.country_of_origin || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    MOQ
                  </dt>
                  <dd className="mt-1 text-sm">{product.moq || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Lead time
                  </dt>
                  <dd className="mt-1 text-sm">{product.lead_time || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Incoterms
                  </dt>
                  <dd className="mt-1 text-sm">{product.incoterms || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Price
                  </dt>
                  <dd className="mt-1 text-sm">{product.price || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Certifications
                  </dt>
                  <dd className="mt-1 text-sm">
                    {product.certifications.length > 0
                      ? product.certifications.join(", ")
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm text-neutral-700">
                    {product.description || "—"}
                  </dd>
                </div>
              </dl>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="mt-5 max-h-64 rounded-lg border border-neutral-200 object-cover"
                />
              ) : null}
            </DashboardPanel>
          ) : null}

          <DashboardPanel title="Assessments">
            {assessments.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No assessments yet. Future AI and rule-based checks will appear here
                without changing final admin decisions.
              </p>
            ) : (
              <div className="space-y-3">
                {assessments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-neutral-200 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.assessment_type}</span>
                      <span className="text-xs text-neutral-500">
                        {item.assessor_name} · {item.result}
                      </span>
                    </div>
                    {item.summary ? (
                      <p className="mt-2 text-sm text-neutral-600">{item.summary}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>

        <DashboardPanel title="Audit timeline">
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="relative border-l border-neutral-200 pl-4"
              >
                <div className="absolute -left-1.5 top-1 size-3 rounded-full bg-amber-500" />
                <p className="text-sm font-medium text-neutral-900">
                  {eventLabel(event.event_type)}
                </p>
                {event.message ? (
                  <p className="mt-1 text-sm text-neutral-600">{event.message}</p>
                ) : null}
                <p className="mt-1 text-xs text-neutral-500">
                  {formatDateTime(event.created_at)} · {event.actor_type}
                  {event.from_status && event.to_status
                    ? ` · ${event.from_status} → ${event.to_status}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject case</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Provide a decision reason. This is stored on the verification case audit
            trail{reviewCase.case_type === "product_review" ? " and product record" : ""}.
          </p>
          <textarea
            className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what must be corrected before approval."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void handleReject()}
            >
              Confirm rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
