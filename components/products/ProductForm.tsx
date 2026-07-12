"use client";

import { useMemo, useState } from "react";
import Select from "react-select";
import type { StylesConfig } from "react-select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { certifications } from "@/lib/marketplace/certifications";
import { countries } from "@/lib/marketplace/countries";
import { productCategories } from "@/lib/marketplace/productCategories";
import type { ProductFormValues } from "@/lib/products/types";

type SelectOption = { value: string; label: string };

type ProductFormProps = {
  initialValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
};

const toOption = (value: string): SelectOption => ({ value, label: value });

export default function ProductForm({
  initialValues,
  submitLabel,
  onSubmit,
  saving = false,
  error,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectStyles = useMemo<StylesConfig<SelectOption, boolean>>(
    () => ({
      control: (base) => ({
        ...base,
        minHeight: "44px",
        borderRadius: "10px",
        borderColor: "#e5e7eb",
        boxShadow: "none",
      }),
    }),
    []
  );

  const update = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (!values.name.trim()) {
      setLocalError("Product name is required.");
      return;
    }

    if (!values.category.trim()) {
      setLocalError("Please select a product category.");
      return;
    }

    await onSubmit(values);
  };

  const message = localError ?? error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Product name
          </label>
          <Input
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. 1121 Steam Basmati Rice"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Category
          </label>
          <Select
            options={productCategories}
            value={values.category ? toOption(values.category) : null}
            onChange={(option) =>
              update("category", (option as SelectOption | null)?.value ?? "")
            }
            placeholder="Select category..."
            styles={selectStyles}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Country of origin
          </label>
          <Select
            options={countries}
            value={
              values.country_of_origin
                ? toOption(values.country_of_origin)
                : null
            }
            onChange={(option) =>
              update(
                "country_of_origin",
                (option as SelectOption | null)?.value ?? ""
              )
            }
            placeholder="Select country..."
            isClearable
            styles={selectStyles}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the product, grade, and buyer-specific support."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Minimum order quantity (MOQ)
          </label>
          <Input
            value={values.moq}
            onChange={(e) => update("moq", e.target.value)}
            placeholder="e.g. 25 MT"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Packaging
          </label>
          <Input
            value={values.packaging}
            onChange={(e) => update("packaging", e.target.value)}
            placeholder="e.g. 25 kg PP bags"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Lead time
          </label>
          <Input
            value={values.lead_time}
            onChange={(e) => update("lead_time", e.target.value)}
            placeholder="e.g. 14-21 days"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Incoterms
          </label>
          <Input
            value={values.incoterms}
            onChange={(e) => update("incoterms", e.target.value)}
            placeholder="e.g. FOB, CIF"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            HS code
          </label>
          <Input
            value={values.hs_code}
            onChange={(e) => update("hs_code", e.target.value)}
            placeholder="e.g. 1006.30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Indicative price
          </label>
          <Input
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            placeholder="e.g. USD 950 / MT (FOB)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Certifications
          </label>
          <Select
            isMulti
            options={certifications}
            value={values.certifications.map(toOption)}
            onChange={(options) =>
              update(
                "certifications",
                (options as SelectOption[]).map((option) => option.value)
              )
            }
            placeholder="Select certifications..."
            styles={selectStyles}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Image URL
          </label>
          <Input
            value={values.image_url}
            onChange={(e) => update("image_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="h-11">
        {saving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
