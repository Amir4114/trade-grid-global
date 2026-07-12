"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ProductForm from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";
import { useAuth, useCompany } from "@/contexts/AuthProvider";
import { createDraftProduct } from "@/lib/products/service";
import { EMPTY_PRODUCT_FORM, type ProductFormValues } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/client";

export default function NewSupplierProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { company } = useCompany();
  const supabase = useMemo(() => createClient(), []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ProductFormValues) => {
    if (!company?.id) {
      setError("Company profile not found.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const created = await createDraftProduct(supabase, {
        companyId: company.id,
        createdBy: user?.id ?? null,
        values,
      });
      router.push(`/dashboard/supplier/products/${created.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create product draft."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="supplier"
      title="New product"
      description="Save a draft now and submit it for review whenever you are ready."
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
        <ProductForm
          initialValues={EMPTY_PRODUCT_FORM}
          submitLabel="Save draft"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
        />
      </DashboardPanel>
    </DashboardShell>
  );
}
