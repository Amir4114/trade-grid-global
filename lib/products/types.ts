import type { Product, ProductStatus } from "@/lib/database/types";

export type { Product, ProductStatus };

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

/**
 * The editable content fields of a product. Status is intentionally excluded:
 * status changes only happen through the dedicated transition RPCs.
 */
export type ProductFormValues = {
  name: string;
  category: string;
  description: string;
  country_of_origin: string;
  moq: string;
  packaging: string;
  lead_time: string;
  incoterms: string;
  hs_code: string;
  price: string;
  certifications: string[];
  image_url: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  category: "",
  description: "",
  country_of_origin: "",
  moq: "",
  packaging: "",
  lead_time: "",
  incoterms: "",
  hs_code: "",
  price: "",
  certifications: [],
  image_url: "",
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    country_of_origin: product.country_of_origin ?? "",
    moq: product.moq ?? "",
    packaging: product.packaging ?? "",
    lead_time: product.lead_time ?? "",
    incoterms: product.incoterms ?? "",
    hs_code: product.hs_code ?? "",
    price: product.price ?? "",
    certifications: product.certifications ?? [],
    image_url: product.image_url ?? "",
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
    moq: product.moq || "On request",
    packaging: product.packaging || "Export packaging",
    supplierName,
  };
}
