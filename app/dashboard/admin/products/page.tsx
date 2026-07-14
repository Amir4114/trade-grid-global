"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/database/types";
import {
  approveProduct,
  listPendingProducts,
  rejectProduct,
} from "@/lib/products/service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminProductsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rejectTarget, setRejectTarget] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const rows = await listPendingProducts(supabase);
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
  }, [supabase, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    reload();
  };

  const handleApprove = async (product: Product) => {
    try {
      setActionError(null);
      setBusyId(product.id);
      await approveProduct(supabase, product.id);
      toast.success("Product approved successfully");
      reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve product.";
      toast.error("Approval failed", { description: message });
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (product: Product) => {
    setActionError(null);
    setRejectReason("");
    setRejectTarget(product);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;

    try {
      setActionError(null);
      setBusyId(rejectTarget.id);
      await rejectProduct(supabase, rejectTarget.id, rejectReason);
      toast.success("Product rejected");
      setRejectTarget(null);
      setRejectReason("");
      reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject product.";
      toast.error("Rejection failed", { description: message });
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Product Moderation"
      description="Review products submitted by suppliers and publish or reject them."
    >
      {actionError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <DashboardPanel
        title="Pending review"
        description="Only pending products appear here. Approving publishes them to the marketplace."
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            <div className="mr-3 size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
            Loading queue...
          </div>
        ) : loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              Nothing to review
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              There are no products awaiting moderation right now.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Origin</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((product) => {
                    const isBusy = busyId === product.id;
                    return (
                      <tr key={product.id} className="align-top hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {product.name}
                          </div>
                          {product.description ? (
                            <div className="mt-1 line-clamp-2 max-w-md text-xs text-neutral-500">
                              {product.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {product.category}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {product.country_of_origin || "-"}
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {formatDate(product.updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void handleApprove(product)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => openReject(product)}
                            >
                              Reject
                            </Button>
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
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Provide a reason so the supplier can correct and resubmit
            {rejectTarget ? ` “${rejectTarget.name}”` : ""}.
          </p>
          <textarea
            className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Missing valid certifications or unclear specifications."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => void confirmReject()}
            >
              Reject product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
