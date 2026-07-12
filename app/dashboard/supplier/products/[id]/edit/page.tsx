"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ProductForm from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/AuthProvider";
import { isOnboardingComplete } from "@/lib/auth/redirects";
import type { Product } from "@/lib/database/types";
import {
  getOwnProductById,
  submitProductForReview,
  updateProductContent,
} from "@/lib/products/service";
import {
  PRODUCT_STATUS_LABELS,
  canEditProduct,
  canSubmitProduct,
  productToFormValues,
  type ProductFormValues,
} from "@/lib/products/types";
import { createClient } from "@/lib/supabase/client";

export default function EditSupplierProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onboardingComplete = isOnboardingComplete(company);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!productId) return;

      try {
        const row = await getOwnProductById(supabase, productId);
        if (!active) return;
        if (!row) {
          setLoadError("Product not found or you do not have access to it.");
        }
        setProduct(row);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load product."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [productId, supabase]);

  const handleSave = async (values: ProductFormValues) => {
    if (!product) return;

    try {
      setSaving(true);
      setSaveError(null);
      setNotice(null);
      const updated = await updateProductContent(supabase, product.id, values);
      setProduct(updated);
      setNotice("Product saved.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!product) return;

    try {
      setSubmitting(true);
      setSaveError(null);
      setNotice(null);
      await submitProductForReview(supabase, product.id);
      router.push("/dashboard/supplier/products");
      router.refresh();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to submit product."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const editable = product ? canEditProduct(product.status) : false;

  return (
    <DashboardShell
      role="supplier"
      title="Edit product"
      description="Update product details and submit for review when ready."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/supplier/products">
            <ArrowLeft className="size-4" />
            Back to products
          </Link>
        </Button>
      }
    >
      <DashboardPanel>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            <div className="mr-3 size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
            Loading product...
          </div>
        ) : loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/dashboard/supplier/products">Back to products</Link>
            </Button>
          </div>
        ) : product ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-neutral-500">Status:</span>
              <span className="font-medium text-neutral-900">
                {PRODUCT_STATUS_LABELS[product.status]}
              </span>
            </div>

            {product.status === "rejected" && product.rejection_reason ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This product was rejected: {product.rejection_reason}. Update it
                and resubmit for review.
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}

            {editable ? (
              <>
                <ProductForm
                  initialValues={productToFormValues(product)}
                  submitLabel="Save changes"
                  saving={saving}
                  error={saveError}
                  onSubmit={handleSave}
                />

                {canSubmitProduct(product.status) ? (
                  <div className="flex flex-col gap-2 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-neutral-500">
                      {onboardingComplete
                        ? "Submitting sends this product to admin review."
                        : "Complete your company onboarding to submit for review."}
                    </p>
                    <Button
                      disabled={submitting || !onboardingComplete}
                      onClick={() => void handleSubmitForReview()}
                    >
                      {submitting ? "Submitting..." : "Submit for review"}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                This product is {PRODUCT_STATUS_LABELS[product.status].toLowerCase()}{" "}
                and cannot be edited. Only draft or rejected products are
                editable.
              </div>
            )}
          </div>
        ) : null}
      </DashboardPanel>
    </DashboardShell>
  );
}
