import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Product } from "@/lib/database/types";
import type { ProductFormValues } from "@/lib/products/types";

type Client = SupabaseClient<Database>;

export type PublicProductFilters = {
  q?: string;
  category?: string;
  country?: string;
};

function sanitizeValues(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    description: values.description.trim(),
    country_of_origin: values.country_of_origin.trim(),
    moq: values.moq.trim(),
    packaging: values.packaging.trim(),
    lead_time: values.lead_time.trim(),
    incoterms: values.incoterms.trim(),
    hs_code: values.hs_code.trim(),
    price: values.price.trim(),
    certifications: values.certifications,
    image_url: values.image_url.trim() || null,
  };
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
      ...sanitizeValues(params.values),
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
      ...sanitizeValues(values),
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

/* ----------------------------- admin: moderate ---------------------------- */

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

export async function listPublishedProducts(
  supabase: Client,
  filters: PublicProductFilters = {}
): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "published");

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.country) {
    query = query.eq("country_of_origin", filters.country);
  }

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query.order("published_at", {
    ascending: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProductUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getPublishedProductById(
  supabase: Client,
  productId: string
): Promise<Product | null> {
  // Legacy mock links use ids like "product-1" which are not UUIDs. Skip the
  // query for those so we cleanly fall through to the transitional mock lookup
  // instead of raising a Postgres uuid cast error.
  if (!isProductUuid(productId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
