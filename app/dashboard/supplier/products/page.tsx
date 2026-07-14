"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompany } from "@/contexts/AuthProvider";
import { isOnboardingComplete } from "@/lib/auth/redirects";
import type { Product, ProductStatus } from "@/lib/database/types";
import {
  archiveProduct,
  listOwnProducts,
  reopenPublishedProductForEditing,
  restoreArchivedProduct,
  submitProductForReview,
} from "@/lib/products/service";
import {
  PRODUCT_STATUS_LABELS,
  canArchiveProduct,
  canEditProduct,
  canReopenPublishedProduct,
  canRestoreProduct,
  canSubmitProduct,
  canViewProduct,
  submitActionLabel,
} from "@/lib/products/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const STATUS_STYLES: Record<ProductStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  pending: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-neutral-200 text-neutral-500",
};

type ConfirmAction =
  | { type: "reopen"; product: Product }
  | { type: "restore"; product: Product }
  | null;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupplierProductsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const companyId = company?.id ?? null;
  const onboardingComplete = isOnboardingComplete(company);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!companyId) return;

      try {
        const rows = await listOwnProducts(supabase, companyId);
        if (!active) return;
        setProducts(rows);
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
  }, [companyId, supabase, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    reload();
  };

  const handleSubmit = async (product: Product) => {
    try {
      setActionError(null);
      setBusyId(product.id);
      await submitProductForReview(supabase, product.id);
      toast.success("Product submitted for review", {
        description: `${product.name} is waiting for admin approval.`,
      });
      reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit product.";
      toast.error("Submission failed", { description: message });
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (product: Product) => {
    try {
      setActionError(null);
      setBusyId(product.id);
      await archiveProduct(supabase, product.id);
      toast.success("Product archived");
      reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to archive product.";
      toast.error("Archive failed", { description: message });
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const product = confirmAction.product;

    try {
      setActionError(null);
      setBusyId(product.id);

      if (confirmAction.type === "reopen") {
        await reopenPublishedProductForEditing(supabase, product.id);
        toast.success("Product reopened for editing", {
          description: `${product.name} was moved back to draft.`,
        });
        setConfirmAction(null);
        router.push(`/dashboard/supplier/products/${product.id}/edit`);
        router.refresh();
        return;
      }

      if (confirmAction.type === "restore") {
        await restoreArchivedProduct(supabase, product.id);
        toast.success("Product restored to draft");
        setConfirmAction(null);
        reload();
        return;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update product.";
      toast.error("Action failed", { description: message });
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      role="supplier"
      title="Products"
      description="Create, submit, and manage your export product listings."
      actions={
        <Button asChild size="sm">
          <Link href="/dashboard/supplier/products/new">
            <Plus className="size-4" />
            New product
          </Link>
        </Button>
      }
    >
      {!onboardingComplete ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can create and edit product drafts now. Complete your company
          onboarding to submit products for review and publishing.
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <DashboardPanel>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            <div className="mr-3 size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
            Loading products...
          </div>
        ) : loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={retry}
            >
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              No products yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              Create your first product draft. You can save and refine it before
              submitting it for review.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/supplier/products/new">
                <Plus className="size-4" />
                Create product draft
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((product) => {
                    const isBusy = busyId === product.id;
                    const hasActions =
                      canEditProduct(product.status) ||
                      canSubmitProduct(product.status) ||
                      canArchiveProduct(product.status) ||
                      canViewProduct(product.status) ||
                      canRestoreProduct(product.status) ||
                      canReopenPublishedProduct(product.status);

                    return (
                      <tr
                        key={product.id}
                        className="align-top hover:bg-neutral-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {product.name}
                          </div>
                          {product.status === "rejected" &&
                          product.rejection_reason ? (
                            <div className="mt-1 text-xs text-red-600">
                              Rejected: {product.rejection_reason}
                            </div>
                          ) : null}
                          {product.status === "pending" ? (
                            <div className="mt-1 text-xs text-amber-700">
                              Locked while awaiting admin review.
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {product.category}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[product.status]}`}
                          >
                            {PRODUCT_STATUS_LABELS[product.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {formatDate(product.updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canEditProduct(product.status) ? (
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  href={`/dashboard/supplier/products/${product.id}/edit`}
                                >
                                  Edit
                                </Link>
                              </Button>
                            ) : null}

                            {canViewProduct(product.status) ? (
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  href={`/dashboard/supplier/products/${product.id}/edit`}
                                >
                                  View
                                </Link>
                              </Button>
                            ) : null}

                            {canReopenPublishedProduct(product.status) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "reopen",
                                    product,
                                  })
                                }
                              >
                                Edit &amp; resubmit
                              </Button>
                            ) : null}

                            {canSubmitProduct(product.status) ? (
                              <Button
                                size="sm"
                                disabled={isBusy || !onboardingComplete}
                                title={
                                  onboardingComplete
                                    ? undefined
                                    : "Complete onboarding to submit"
                                }
                                onClick={() => void handleSubmit(product)}
                              >
                                {submitActionLabel(product.status)}
                              </Button>
                            ) : null}

                            {canArchiveProduct(product.status) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => void handleArchive(product)}
                              >
                                Archive
                              </Button>
                            ) : null}

                            {canRestoreProduct(product.status) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                  setConfirmAction({
                                    type: "restore",
                                    product,
                                  })
                                }
                              >
                                Restore to draft
                              </Button>
                            ) : null}

                            {!hasActions ? (
                              <span className="text-xs text-neutral-400">
                                No actions
                              </span>
                            ) : null}
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

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {confirmAction?.type === "reopen" ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit &amp; resubmit published product?</DialogTitle>
                <DialogDescription>
                  This will move{" "}
                  <span className="font-medium text-neutral-900">
                    {confirmAction.product.name}
                  </span>{" "}
                  back to draft. It will be removed from the public marketplace
                  immediately and will require admin approval again before it
                  can be published.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={busyId !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleConfirmAction()}
                  disabled={busyId !== null}
                >
                  {busyId ? "Processing..." : "Move to draft"}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {confirmAction?.type === "restore" ? (
            <>
              <DialogHeader>
                <DialogTitle>Restore archived product to draft?</DialogTitle>
                <DialogDescription>
                  This will restore{" "}
                  <span className="font-medium text-neutral-900">
                    {confirmAction.product.name}
                  </span>{" "}
                  to draft so you can edit and submit it for review again. It
                  will not return directly to published.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={busyId !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleConfirmAction()}
                  disabled={busyId !== null}
                >
                  {busyId ? "Processing..." : "Restore to draft"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
