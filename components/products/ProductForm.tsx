"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Select from "react-select";
import type { StylesConfig } from "react-select";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";
import { certifications } from "@/lib/marketplace/certifications";
import { countries } from "@/lib/marketplace/countries";
import { productCategories } from "@/lib/marketplace/productCategories";
import {
  INCOTERM_OPTIONS,
  LEAD_TIME_UNIT_OPTIONS,
  TRADE_CURRENCY_OPTIONS,
  TRADE_UNIT_OPTIONS,
} from "@/lib/products/trade-constants";
import { validateProductFormValues } from "@/lib/products/trade-data";
import { MAX_GALLERY_IMAGES } from "@/lib/products/storage";
import type { ProductFormValues } from "@/lib/products/types";

type SelectOption = { value: string; label: string };

type ProductFormProps = {
  initialValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
  uploadImage?: (file: File) => Promise<string>;
};

const toOption = (value: string): SelectOption => ({ value, label: value });

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ProductForm({
  initialValues,
  submitLabel,
  onSubmit,
  saving = false,
  error,
  uploadImage,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const busy = saving || uploadingMain || uploadingGallery;

  const handleMainImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadImage) return;

    setMediaError(null);
    setUploadingMain(true);
    try {
      const url = await uploadImage(file);
      update("image_url", url);
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploadingMain(false);
    }
  };

  const handleGallerySelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !uploadImage) return;

    const remaining = MAX_GALLERY_IMAGES - values.gallery.length;
    if (remaining <= 0) {
      setMediaError(`You can add up to ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }

    setMediaError(null);
    setUploadingGallery(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, remaining)) {
        uploaded.push(await uploadImage(file));
      }
      if (uploaded.length > 0) {
        setValues((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...uploaded],
        }));
      }
      if (files.length > remaining) {
        setMediaError(
          `Only ${remaining} more image(s) could be added (max ${MAX_GALLERY_IMAGES}).`
        );
      }
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : "Failed to upload gallery image."
      );
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeMainImage = () => {
    setMediaError(null);
    update("image_url", "");
  };

  const removeGalleryImage = (url: string) => {
    setMediaError(null);
    setValues((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((item) => item !== url),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (uploadingMain || uploadingGallery) {
      setLocalError("Please wait for image uploads to finish.");
      return;
    }

    if (!values.name.trim()) {
      setLocalError("Product name is required.");
      return;
    }

    if (!values.category.trim()) {
      setLocalError("Please select a product category.");
      return;
    }

    const validationError = validateProductFormValues(values);
    if (validationError) {
      setLocalError(validationError);
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

      <FormSection
        title="Basic information"
        description="Core product identity shown on marketplace listings."
      >
        <div className="md:col-span-2">
          <FieldLabel htmlFor="product-name">Product name</FieldLabel>
          <Input
            id="product-name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. 1121 Steam Basmati Rice"
          />
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <Select
            inputId="product-category"
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
          <FieldLabel>Country of origin</FieldLabel>
          <Select
            inputId="product-country"
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
          <FieldLabel htmlFor="product-description">Description</FieldLabel>
          <textarea
            id="product-description"
            className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the product, grade, and buyer-specific support."
          />
        </div>
      </FormSection>

      <FormSection
        title="Trade & order details"
        description="Structured order terms used for RFQ matching and buyer comparison."
      >
        <div>
          <FieldLabel
            htmlFor="moq-quantity"
            help={{
              label: "MOQ",
              description:
                "MOQ is the smallest quantity a buyer can order.",
              example: "25 MT",
            }}
          >
            Minimum order quantity (MOQ)
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Input
              id="moq-quantity"
              type="number"
              min="0"
              step="any"
              value={values.moq_quantity}
              onChange={(e) => update("moq_quantity", e.target.value)}
              placeholder="25"
            />
            <Select
              inputId="moq-unit"
              options={TRADE_UNIT_OPTIONS}
              value={values.moq_unit ? toOption(values.moq_unit) : null}
              onChange={(option) =>
                update("moq_unit", (option as SelectOption | null)?.value ?? "")
              }
              placeholder="Unit"
              isClearable
              styles={selectStyles}
            />
          </div>
        </div>

        <div>
          <FieldLabel
            htmlFor="packaging"
            help={{
              label: "Packaging",
              description:
                "Describe how the product is packed for wholesale or export shipment.",
              example: "25 kg PP bags",
            }}
          >
            Packaging
          </FieldLabel>
          <Input
            id="packaging"
            value={values.packaging}
            onChange={(e) => update("packaging", e.target.value)}
            placeholder="e.g. 25 kg PP bags"
          />
        </div>

        <div>
          <FieldLabel
            help={{
              label: "Lead time",
              description:
                "Estimated time required to prepare the order for shipment after confirmation.",
              example: "14–21 days",
            }}
          >
            Lead time
          </FieldLabel>
          <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-2">
            <Input
              id="lead-time-min"
              type="number"
              min="0"
              step="1"
              value={values.lead_time_min}
              onChange={(e) => update("lead_time_min", e.target.value)}
              placeholder="14"
              aria-label="Lead time minimum"
            />
            <span className="text-sm text-neutral-500">to</span>
            <Input
              type="number"
              min="0"
              step="1"
              value={values.lead_time_max}
              onChange={(e) => update("lead_time_max", e.target.value)}
              placeholder="21"
              aria-label="Lead time maximum"
            />
            <Select
              inputId="lead-time-unit"
              options={LEAD_TIME_UNIT_OPTIONS}
              value={
                values.lead_time_unit
                  ? toOption(values.lead_time_unit)
                  : null
              }
              onChange={(option) =>
                update(
                  "lead_time_unit",
                  (option as SelectOption | null)?.value ?? ""
                )
              }
              placeholder="Unit"
              isClearable
              styles={selectStyles}
            />
          </div>
        </div>

        <div>
          <FieldLabel
            help={{
              label: "Incoterms",
              description:
                "Incoterms define which party is responsible for transport, cost and risk during delivery. This is general trade guidance, not legal advice.",
              example: "FOB, CIF",
            }}
          >
            Incoterms
          </FieldLabel>
          <Select
            isMulti
            inputId="incoterms"
            options={INCOTERM_OPTIONS}
            value={values.incoterms.map(toOption)}
            onChange={(options) =>
              update(
                "incoterms",
                (options as SelectOption[]).map((option) => option.value)
              )
            }
            placeholder="Select Incoterms..."
            styles={selectStyles}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="hs-code"
            help={{
              label: "HS code",
              description:
                "HS Code is the international customs classification code used to identify traded goods.",
              example: "1006.30",
            }}
          >
            HS code
          </FieldLabel>
          <Input
            id="hs-code"
            value={values.hs_code}
            onChange={(e) => update("hs_code", e.target.value)}
            placeholder="e.g. 1006.30"
          />
        </div>
      </FormSection>

      <FormSection
        title="Pricing"
        description="Indicative pricing helps buyers compare listings. Final pricing may vary."
      >
        <div className="md:col-span-2">
          <FieldLabel
            help={{
              label: "Indicative price",
              description:
                "An indicative price is an estimated starting price. Final pricing may change based on quantity, destination and contract terms.",
              example: "950 USD per MT FOB",
            }}
          >
            Indicative price
          </FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              id="price-amount"
              type="number"
              min="0"
              step="any"
              value={values.price_amount}
              onChange={(e) => update("price_amount", e.target.value)}
              placeholder="950"
              aria-label="Price amount"
            />
            <Select
              inputId="price-currency"
              options={TRADE_CURRENCY_OPTIONS}
              value={
                values.price_currency
                  ? toOption(values.price_currency)
                  : null
              }
              onChange={(option) =>
                update(
                  "price_currency",
                  (option as SelectOption | null)?.value ?? ""
                )
              }
              placeholder="Currency"
              isClearable
              styles={selectStyles}
            />
            <Select
              inputId="price-unit"
              options={TRADE_UNIT_OPTIONS}
              value={values.price_unit ? toOption(values.price_unit) : null}
              onChange={(option) =>
                update(
                  "price_unit",
                  (option as SelectOption | null)?.value ?? ""
                )
              }
              placeholder="Per unit"
              isClearable
              styles={selectStyles}
            />
            <Select
              inputId="price-incoterm"
              options={INCOTERM_OPTIONS}
              value={
                values.price_incoterm
                  ? toOption(values.price_incoterm)
                  : null
              }
              onChange={(option) =>
                update(
                  "price_incoterm",
                  (option as SelectOption | null)?.value ?? ""
                )
              }
              placeholder="Price basis"
              isClearable
              styles={selectStyles}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Leave all price fields empty if you prefer buyers to contact you for
            pricing.
          </p>
        </div>
      </FormSection>

      <FormSection title="Certifications">
        <div className="md:col-span-2">
          <FieldLabel
            help={{
              label: "Certifications",
              description:
                "Select only certifications currently held and applicable to this product or company. Selection does not imply platform verification.",
            }}
          >
            Certifications
          </FieldLabel>
          <Select
            isMulti
            inputId="certifications"
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
      </FormSection>

      {uploadImage ? (
        <section className="space-y-5 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 md:p-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Product media
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Images are shown on marketplace cards and product detail pages.
            </p>
          </div>

          {mediaError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {mediaError}
            </p>
          ) : null}

          <div>
            <FieldLabel>Main product image</FieldLabel>
            <p className="mb-3 text-xs text-neutral-500">
              This is the primary image shown on marketplace cards and product
              pages. Use a clear, product-focused image. Square or near-square
              recommended. PNG, JPG, or WebP. Maximum 5 MB.
            </p>

            {values.image_url ? (
              <div className="flex items-start gap-4">
                <div className="h-32 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={values.image_url}
                    alt="Main product"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => mainInputRef.current?.click()}
                  >
                    {uploadingMain ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={removeMainImage}
                  >
                    <X className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => mainInputRef.current?.click()}
              >
                {uploadingMain ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {uploadingMain ? "Uploading..." : "Upload main image"}
              </Button>
            )}

            <input
              ref={mainInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void handleMainImageSelect(e)}
            />
          </div>

          <div>
            <FieldLabel>
              Gallery images ({values.gallery.length}/{MAX_GALLERY_IMAGES})
            </FieldLabel>
            <p className="mb-3 text-xs text-neutral-500">
              Add additional images of the product, packaging, labels, cartons,
              pallets or export presentation.
            </p>

            {values.gallery.length > 0 ? (
              <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {values.gallery.map((url) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Gallery"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove image"
                      disabled={busy}
                      onClick={() => removeGalleryImage(url)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80 disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {values.gallery.length < MAX_GALLERY_IMAGES ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => galleryInputRef.current?.click()}
              >
                {uploadingGallery ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {uploadingGallery ? "Uploading..." : "Add gallery images"}
              </Button>
            ) : null}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => void handleGallerySelect(e)}
            />
          </div>
        </section>
      ) : null}

      <Button type="submit" disabled={busy} className="h-11">
        {saving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
