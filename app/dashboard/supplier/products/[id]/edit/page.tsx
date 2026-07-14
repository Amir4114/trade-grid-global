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

import { uploadProductImage } from "@/lib/products/storage";

import {

  PRODUCT_STATUS_LABELS,

  canEditProduct,

  canSubmitProduct,

  productReadOnlySummary,

  productToFormValues,

  saveActionLabel,

  submitActionLabel,

  type ProductFormValues,

} from "@/lib/products/types";

import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";



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

      toast.success(
        product.status === "draft" ? "Draft saved" : "Product updated"
      );

      setNotice(

        product.status === "draft"

          ? "Draft saved."

          : "Product changes saved."

      );

    } catch (err) {

      const message =
        err instanceof Error ? err.message : "Failed to save product.";
      toast.error("Save failed", { description: message });
      setSaveError(message);

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

      toast.success("Product submitted for review", {
        description: `${product.name} is waiting for admin approval.`,
      });

      router.push("/dashboard/supplier/products");

      router.refresh();

    } catch (err) {

      const message =
        err instanceof Error ? err.message : "Failed to submit product.";
      toast.error("Submission failed", { description: message });
      setSaveError(message);

    } finally {

      setSubmitting(false);

    }

  };



  const editable = product ? canEditProduct(product.status) : false;



  return (

    <DashboardShell

      role="supplier"

      title={editable ? "Edit product" : "View product"}

      description={

        editable

          ? "Update your draft and submit for review when ready."

          : "Review product details. Use the products list for lifecycle actions."

      }

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



            {product.status === "pending" ? (

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">

                This product is awaiting admin review and cannot be edited.

              </div>

            ) : null}



            {product.status === "published" ? (

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">

                This product is published on the marketplace. To change it, use

                &quot;Edit &amp; resubmit&quot; on the products list to move it

                back to draft first.

              </div>

            ) : null}



            {product.status === "archived" ? (

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">

                This product is archived and not publicly visible. Use

                &quot;Restore to draft&quot; on the products list to edit it

                again.

              </div>

            ) : null}



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

                  submitLabel={saveActionLabel(product.status)}

                  saving={saving}

                  error={saveError}

                  onSubmit={handleSave}

                  uploadImage={

                    company?.id

                      ? (file) =>

                          uploadProductImage(supabase, {

                            companyId: company.id,

                            file,

                          })

                      : undefined

                  }

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

                      {submitting

                        ? "Submitting..."

                        : submitActionLabel(product.status)}

                    </Button>

                  </div>

                ) : null}

              </>

            ) : (

              <div className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5">

                <div>

                  <h2 className="text-lg font-semibold text-neutral-900">

                    {product.name}

                  </h2>

                  {product.description ? (

                    <p className="mt-2 text-sm leading-6 text-neutral-600">

                      {product.description}

                    </p>

                  ) : null}

                </div>



                <dl className="grid gap-4 sm:grid-cols-2">

                  {productReadOnlySummary(product).map((row) => (

                    <div key={row.label}>

                      <dt className="text-sm text-neutral-500">{row.label}</dt>

                      <dd className="mt-1 font-medium text-neutral-900">

                        {row.value}

                      </dd>

                    </div>

                  ))}

                </dl>



                {product.image_url ? (

                  <div>

                    <p className="mb-2 text-sm text-neutral-500">Main image</p>

                    <div className="h-40 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">

                      {/* eslint-disable-next-line @next/next/no-img-element */}

                      <img

                        src={product.image_url}

                        alt={product.name}

                        className="h-full w-full object-cover"

                      />

                    </div>

                  </div>

                ) : null}

              </div>

            )}

          </div>

        ) : null}

      </DashboardPanel>

    </DashboardShell>

  );

}


