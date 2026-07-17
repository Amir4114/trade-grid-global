"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  CaseStatusBadge,
  CaseTypeBadge,
  PriorityBadge,
  SlaBadge,
} from "@/components/admin/verification/VerificationCaseBadges";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildVerificationQueueStats,
  listVerificationCases,
  setVerificationCasePriority,
  startVerificationCaseReview,
} from "@/lib/verification/service";
import { formatDateTime } from "@/lib/verification/sla";
import type {
  VerificationCasePriority,
  VerificationCaseSummary,
  VerificationQueueFilters,
} from "@/lib/verification/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const PRIORITY_OPTIONS: VerificationCasePriority[] = [
  "urgent",
  "high",
  "normal",
  "low",
];

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "amber" | "red" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-neutral-200 bg-white text-neutral-900";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function VerificationCommandCenter() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<VerificationCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<VerificationQueueFilters>({
    status: "active",
    caseType: "all",
    priority: "all",
    sla: "all",
    sort: "sla",
    q: "",
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const data = await listVerificationCases(supabase, filters);
        if (!active) return;
        setRows(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load verification queue."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, filters, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const stats = useMemo(() => buildVerificationQueueStats(rows), [rows]);

  const handleStartReview = async (caseId: string) => {
    try {
      setBusyId(caseId);
      await startVerificationCaseReview(supabase, caseId);
      toast.success("Review started");
      reload();
    } catch (err) {
      toast.error("Unable to start review", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePriorityChange = async (
    caseId: string,
    priority: VerificationCasePriority
  ) => {
    try {
      setBusyId(caseId);
      await setVerificationCasePriority(supabase, caseId, priority);
      toast.success("Priority updated");
      reload();
    } catch (err) {
      toast.error("Unable to update priority", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Verification Command Center"
      description="Operational queue for company verification and product review with SLA tracking and audit trail."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Pending" value={stats.totalPending} />
        <SummaryCard label="In Review" value={stats.inReview} tone="blue" />
        <SummaryCard label="Due Soon" value={stats.dueSoon} tone="amber" />
        <SummaryCard label="Overdue" value={stats.overdue} tone="red" />
      </div>

      <DashboardPanel
        title="Review queue"
        description="Company verification and product moderation cases in one operational view."
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-6">
          <Input
            className="lg:col-span-2"
            placeholder="Search company or product"
            value={filters.q ?? ""}
            onChange={(e) =>
              setFilters((current) => ({ ...current, q: e.target.value }))
            }
          />
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={filters.caseType ?? "all"}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                caseType: e.target.value as VerificationQueueFilters["caseType"],
              }))
            }
          >
            <option value="all">All case types</option>
            <option value="company_verification">Company verification</option>
            <option value="product_review">Product review</option>
          </select>
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={filters.status ?? "active"}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                status: e.target.value as VerificationQueueFilters["status"],
              }))
            }
          >
            <option value="active">Active cases</option>
            <option value="pending">Pending</option>
            <option value="in_review">In review</option>
            <option value="all">All statuses</option>
          </select>
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={filters.priority ?? "all"}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                priority: e.target.value as VerificationQueueFilters["priority"],
              }))
            }
          >
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={filters.sla ?? "all"}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                sla: e.target.value as VerificationQueueFilters["sla"],
              }))
            }
          >
            <option value="all">All SLA states</option>
            <option value="on_track">On track</option>
            <option value="due_soon">Due soon</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={filters.sort ?? "sla"}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                sort: e.target.value as VerificationQueueFilters["sort"],
              }))
            }
          >
            <option value="sla">Sort: SLA deadline</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="newest">Sort: Newest first</option>
            <option value="priority">Sort: Priority</option>
          </select>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            <div className="mr-3 size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
            Loading queue...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">Queue is clear</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              No verification cases match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Case</th>
                    <th className="px-4 py-3 font-semibold">Entity</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Waiting</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold">SLA</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map((row) => {
                    const isBusy = busyId === row.id;
                    return (
                      <tr key={row.id} className="align-top hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <CaseTypeBadge caseType={row.case_type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {row.entity_name}
                          </div>
                          {row.company_name ? (
                            <div className="mt-1 text-xs text-neutral-500">
                              {row.company_name}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {formatDateTime(row.submitted_at)}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {row.waiting_label}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={row.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <SlaBadge state={row.sla_state} />
                        </td>
                        <td className="px-4 py-3">
                          <CaseStatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/admin/verification/${row.id}`}>
                                Open Review
                              </Link>
                            </Button>
                            {row.status === "pending" ? (
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => void handleStartReview(row.id)}
                              >
                                Start Review
                              </Button>
                            ) : null}
                            <select
                              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs"
                              value={row.priority}
                              disabled={isBusy}
                              onChange={(e) =>
                                void handlePriorityChange(
                                  row.id,
                                  e.target.value as VerificationCasePriority
                                )
                              }
                            >
                              {PRIORITY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
