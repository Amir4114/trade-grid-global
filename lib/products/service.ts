import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Product, ProductStatus, PublicProduct } from "@/lib/database/types";
import {
  buildTradePayload,
  validateProductFormValues,
} from "@/lib/products/trade-data";
import type { ProductFormValues } from "@/lib/products/types";

type Client = SupabaseClient<Database>;

export type PublicProductFilters = {
  q?: string;
  category?: string;
  country?: string;
  certification?: string;
};

export type Pagination = {
  page?: number;
  pageSize?: number;
};

export const DEFAULT_PAGE_SIZE = 12;

export type PublicProductPage = {
  rows: PublicProduct[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function sanitizeProductFormValues(values: ProductFormValues) {
  const validationError = validateProductFormValues(values);
  if (validationError) {
    throw new Error(validationError);
  }

  const trade = buildTradePayload(values);

  return {
    name: values.name.trim(),
    category: values.category.trim(),
    description: values.description.trim(),
    country_of_origin: values.country_of_origin.trim(),
    moq: trade.moq,
    moq_quantity: trade.moq_quantity,
    moq_unit: trade.moq_unit,
    packaging: values.packaging.trim(),
    lead_time: trade.lead_time,
    lead_time_min: trade.lead_time_min,
    lead_time_max: trade.lead_time_max,
    lead_time_unit: trade.lead_time_unit,
    incoterms: trade.incoterms,
    incoterms_codes: trade.incoterms_codes,
    hs_code: values.hs_code.trim(),
    price: trade.price,
    price_amount: trade.price_amount,
    price_currency: trade.price_currency,
    price_unit: trade.price_unit,
    price_incoterm: trade.price_incoterm,
    certifications: values.certifications,
    image_url: values.image_url.trim() || null,
    gallery: values.gallery.map((url) => url.trim()).filter(Boolean),
  };
}

/**
 * Strip characters that carry meaning inside a PostgREST `or(...)` filter
 * expression (comma, parentheses) and the ilike wildcards, so a user's raw
 * search text cannot alter the filter grammar. Authorization never depends on
 * this value: published-only visibility is enforced by the database view.
 */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()*%\\:]/g, " ").trim();
}

/* --------------------------- supplier: read own --------------------------- */

export async function listOwnProducts(
  supabase: Client,
  companyId: string
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getOwnProductById(
  supabase: Client,
  productId: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/* --------------------------- supplier: mutate ----------------------------- */

export async function createDraftProduct(
  supabase: Client,
  params: { companyId: string; createdBy: string | null; values: ProductFormValues }
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: params.companyId,
      created_by: params.createdBy,
      status: "draft",
      ...sanitizeProductFormValues(params.values),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateProductContent(
  supabase: Client,
  productId: string,
  values: ProductFormValues
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update({
      ...sanitizeProductFormValues(values),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/* ---------------------- status transitions (RPC) -------------------------- */

export async function submitProductForReview(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("submit_product_for_review", {
    product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function archiveProduct(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("archive_product", {
    product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function restoreArchivedProduct(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("restore_archived_product", {
    product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function reopenPublishedProductForEditing(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc(
    "reopen_published_product_for_editing",
    { product_id: productId }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

/* ----------------------------- admin: moderate ---------------------------- */

export type AdminProductFilters = {
  status?: ProductStatus | "all";
  q?: string;
};

export type AdminProductRow = {
  product: Product;
  companyName: string | null;
  activeReviewCaseId: string | null;
};

export async function listAdminProducts(
  supabase: Client,
  filters: AdminProductFilters = {}
): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("updated_at", {
    ascending: false,
  });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let rows = data ?? [];

  if (filters.q?.trim()) {
    const term = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.country_of_origin.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
    );
  }

  return rows;
}

export async function listPendingProducts(
  supabase: Client
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "pending")
    .order("updated_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function approveProduct(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("approve_product", {
    product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function rejectProduct(
  supabase: Client,
  productId: string,
  reason: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("reject_product", {
    product_id: productId,
    reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

/* ----------------------------- public: read ------------------------------- */

/**
 * List public marketplace products from the public_products view (published
 * only, joined with safe supplier fields), with server-side search, filters,
 * and pagination. The view is the security boundary; query params never widen
 * visibility.
 */
export async function listPublicProducts(
  supabase: Client,
  filters: PublicProductFilters = {},
  pagination: Pagination = {}
): Promise<PublicProductPage> {
  const page = Math.max(1, pagination.page ?? 1);
  const pageSize = Math.max(1, pagination.pageSize ?? DEFAULT_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("public_products")
    .select("*", { count: "exact" });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.country) {
    query = query.eq("country_of_origin", filters.country);
  }

  if (filters.certification) {
    query = query.contains("certifications", [filters.certification]);
  }

  if (filters.q) {
    const term = sanitizeSearchTerm(filters.q);
    if (term) {
      query = query.or(`name.ilike.*${term}*,description.ilike.*${term}*`);
    }
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    rows: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProductUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Load a single public product (with safe supplier identity) from the
 * public_products view. Non-UUID ids (legacy mock links) short-circuit to null
 * so callers can fall through to the transitional mock lookup.
 */
export async function getPublicProductById(
  supabase: Client,
  productId: string
): Promise<PublicProduct | null> {
  if (!isProductUuid(productId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("public_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
