import type {
  Product,
  ProductStatus,
  PublicProduct,
} from "@/lib/database/types";
import {
  displayIncoterms,
  displayLeadTime,
  displayMoq,
  displayPrice,
  productToStructuredFormFields,
} from "@/lib/products/trade-data";

export type { Product, ProductStatus, PublicProduct };

/**
 * Editable states: only draft and rejected products can have their content
 * modified by the owning supplier. Pending/published/archived are locked.
 * This mirrors the RLS UPDATE policy in migration 006 and is used purely for
 * UI affordances (the database remains the source of truth).
 */
export const EDITABLE_STATUSES: ProductStatus[] = ["draft", "rejected"];

/**
 * States from which a supplier may submit a product for admin review.
 */
export const SUBMITTABLE_STATUSES: ProductStatus[] = ["draft", "rejected"];

/**
 * States a supplier may archive from.
 */
export const ARCHIVABLE_STATUSES: ProductStatus[] = [
  "draft",
  "rejected",
  "published",
];

/**
 * States a supplier may restore to draft via restore_archived_product RPC.
 */
export const RESTORABLE_STATUSES: ProductStatus[] = ["archived"];

/**
 * States a supplier may reopen for editing via reopen_published_product_for_editing RPC.
 */
export const REOPENABLE_STATUSES: ProductStatus[] = ["published"];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  pending: "Pending Review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export function canEditProduct(status: ProductStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function canSubmitProduct(status: ProductStatus): boolean {
  return SUBMITTABLE_STATUSES.includes(status);
}

export function canArchiveProduct(status: ProductStatus): boolean {
  return ARCHIVABLE_STATUSES.includes(status);
}

export function canRestoreProduct(status: ProductStatus): boolean {
  return RESTORABLE_STATUSES.includes(status);
}

export function canReopenPublishedProduct(status: ProductStatus): boolean {
  return REOPENABLE_STATUSES.includes(status);
}

export function canViewProduct(status: ProductStatus): boolean {
  return !canEditProduct(status);
}

export function submitActionLabel(status: ProductStatus): string {
  return status === "rejected" ? "Resubmit for review" : "Submit for review";
}

export function saveActionLabel(status: ProductStatus): string {
  return status === "draft" ? "Save draft" : "Save changes";
}

/**
 * The editable content fields of a product. Status is intentionally excluded:
 * status changes only happen through the dedicated transition RPCs.
 */
export type ProductFormValues = {
  name: string;
  category: string;
  description: string;
  country_of_origin: string;
  moq_quantity: string;
  moq_unit: string;
  lead_time_min: string;
  lead_time_max: string;
  lead_time_unit: string;
  incoterms: string[];
  hs_code: string;
  price_amount: string;
  price_currency: string;
  price_unit: string;
  price_incoterm: string;
  packaging: string;
  certifications: string[];
  image_url: string;
  gallery: string[];
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  category: "",
  description: "",
  country_of_origin: "",
  moq_quantity: "",
  moq_unit: "",
  lead_time_min: "",
  lead_time_max: "",
  lead_time_unit: "",
  incoterms: [],
  hs_code: "",
  price_amount: "",
  price_currency: "",
  price_unit: "",
  price_incoterm: "",
  packaging: "",
  certifications: [],
  image_url: "",
  gallery: [],
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    country_of_origin: product.country_of_origin ?? "",
    ...productToStructuredFormFields(product),
    hs_code: product.hs_code ?? "",
    packaging: product.packaging ?? "",
    certifications: product.certifications ?? [],
    image_url: product.image_url ?? "",
    gallery: product.gallery ?? [],
  };
}

/**
 * Minimal view model consumed by the shared ProductCard so it can render both
 * real Supabase products and legacy mock products without a second component.
 */
export type ProductCardView = {
  id: string;
  name: string;
  image: string;
  category: string;
  country: string;
  moq: string;
  packaging: string;
  supplierName?: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";

export function productToCardView(
  product: Product,
  supplierName?: string
): ProductCardView {
  return {
    id: product.id,
    name: product.name,
    image: product.image_url || PLACEHOLDER_IMAGE,
    category: product.category,
    country: product.country_of_origin || "Global",
    moq: displayMoq(product),
    packaging: product.packaging || "Export packaging",
    supplierName,
  };
}

/**
 * Map a public marketplace product (public_products view) to the shared card
 * view, using the safe public company_name as the supplier label.
 */
export function publicProductToCardView(
  product: PublicProduct
): ProductCardView {
  return {
    id: product.id,
    name: product.name,
    image: product.image_url || PLACEHOLDER_IMAGE,
    category: product.category,
    country: product.country_of_origin || "Global",
    moq: displayMoq(product),
    packaging: product.packaging || "Export packaging",
    supplierName: product.company_name || undefined,
  };
}

/**
 * Verification-state semantics for public display. Only a company explicitly
 * marked 'verified' is shown as verified; pending/under_review/unknown values
 * are never presented as a trusted "Verified" badge.
 */
export type PublicVerificationState =
  | "verified"
  | "under-review"
  | "rejected"
  | "pending";

export function mapVerificationState(
  status: string | null | undefined
): PublicVerificationState {
  switch ((status ?? "").toLowerCase()) {
    case "verified":
      return "verified";
    case "under_review":
    case "under-review":
      return "under-review";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}

export function productReadOnlySummary(product: Product): Array<{
  label: string;
  value: string;
}> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Category", value: product.category },
    { label: "Country of origin", value: product.country_of_origin || "—" },
    { label: "MOQ", value: displayMoq(product) },
    { label: "Packaging", value: product.packaging || "—" },
    { label: "Lead time", value: displayLeadTime(product) || "—" },
    { label: "Incoterms", value: displayIncoterms(product) || "—" },
    { label: "HS code", value: product.hs_code || "—" },
    { label: "Indicative price", value: displayPrice(product) || "—" },
  ];

  if (product.certifications.length > 0) {
    rows.push({
      label: "Certifications",
      value: product.certifications.join(", "),
    });
  }

  return rows;
}
