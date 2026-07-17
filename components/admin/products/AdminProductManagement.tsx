"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductStatus } from "@/lib/database/types";
import {
  listAdminProducts,
  type AdminProductRow,
} from "@/lib/products/service";
import { findActiveVerificationCasesByEntityIds } from "@/lib/verification/service";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<ProductStatus | "all"> = [
  "all",
  "draft",
  "pending",
  "published",
  "rejected",
  "archived",
];

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

function statusBadgeClass(status: ProductStatus): string {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "archived":
      return "border-neutral-200 bg-neutral-100 text-neutral-600";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadAdminProductRows(
  supabase: ReturnType<typeof createClient>,
  status: ProductStatus | "all",
  q: string
): Promise<AdminProductRow[]> {
  const products = await listAdminProducts(supabase, { status, q });
  const companyIds = [...new Set(products.map((product) => product.company_id))];

  const [companiesResult, activeCases] = await Promise.all([
    companyIds.length > 0
      ? supabase.from("companies").select("id, company_name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    findActiveVerificationCasesByEntityIds(
      supabase,
      "product_review",
      products.map((product) => product.id)
    ),
  ]);

  if (companiesResult.error) {
    throw new Error(companiesResult.error.message);
  }

  const companyNames = new Map(
    (companiesResult.data ?? []).map((company) => [company.id, company.company_name])
  );

  return products.map((product) => ({
    product,
    companyName: companyNames.get(product.company_id) ?? null,
    activeReviewCaseId: activeCases.get(product.id) ?? null,
  }));
}

export default function AdminProductManagement() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const data = await loadAdminProductRows(supabase, statusFilter, search);
        if (!active) return;
        setRows(data);
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load products."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, statusFilter, search, refreshKey]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { total: rows.length };
    for (const row of rows) {
      counts[row.product.status] = (counts[row.product.status] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const retry = () => {
    setLoadError(null);
    setRefreshKey((key) => key + 1);
  };

  return (
    <DashboardShell
      role="admin"
      title="Product Management"
      description="Monitor supplier listings across all lifecycle states. Listing review decisions are handled in Verification Ops."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/verification">Open Verification Ops</Link>
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Visible results
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">
            Pending review
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">
            {stats.pending ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/70">
            Published
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">
            {stats.published ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Draft / rejected
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            {(stats.draft ?? 0) + (stats.rejected ?? 0)}
          </p>
        </div>
      </div>

      <DashboardPanel
        title="Product catalog"
        description="Search and filter the full admin product inventory. Approve or reject pending listings from the linked verification case."
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
          <Input
            placeholder="Search product name, category, origin, or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProductStatus | "all")
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all"
                  ? "All statuses"
                  : STATUS_LABELS[option as ProductStatus]}
              </option>
            ))}
          </select>
        </div>

        {loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            <div className="mr-3 size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
            Loading products...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              No products match your filters
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              Adjust search or status filters to inspect supplier listings.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map(({ product, companyName, activeReviewCaseId }) => (
                    <tr key={product.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">
                          {product.name}
                        </div>
                        {product.country_of_origin ? (
                          <div className="mt-1 text-xs text-neutral-500">
                            Origin: {product.country_of_origin}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {companyName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {product.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                            statusBadgeClass(product.status)
                          )}
                        >
                          {STATUS_LABELS[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(product.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {activeReviewCaseId ? (
                            <Button asChild size="sm">
                              <Link
                                href={`/dashboard/admin/verification/${activeReviewCaseId}`}
                              >
                                Open Review Case
                              </Link>
                            </Button>
                          ) : product.status === "pending" ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href="/dashboard/admin/verification">
                                Open Verification Ops
                              </Link>
                            </Button>
                          ) : null}
                        </div>
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
