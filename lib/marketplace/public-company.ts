import { cache } from "react"

import type { PublicProduct, PublicSupplier } from "@/lib/database/types"
import { createClient } from "@/lib/supabase/server"

export type PublicCompanyProfile = {
  company: PublicSupplier
  products: PublicProduct[]
  productCount: number
  certifications: string[]
  description: string
}

export type PublicCompanyFilters = {
  q?: string
  country?: string
  category?: string
  verification?: string
}

function normalizePublicSupplier(company: PublicSupplier): PublicSupplier {
  return {
    ...company,
    company_name: company.company_name?.trim() || "Marketplace company",
    country: company.country?.trim() || "Country not listed",
    business_type: company.business_type?.trim() || "Food trade company",
    categories: Array.isArray(company.categories) ? company.categories : [],
    verification_status: company.verification_status || "pending",
  }
}

export async function listPublicCompanies(
  filters: PublicCompanyFilters
): Promise<PublicSupplier[]> {
  const supabase = await createClient()
  let query = supabase
    .from("public_suppliers")
    .select("*")
    .order("company_name", { ascending: true })

  const q = filters.q?.replace(/[%_,()*\\:]/g, " ").trim()
  if (q) query = query.ilike("company_name", `%${q}%`)
  if (filters.country) query = query.eq("country", filters.country)
  if (filters.category) query = query.contains("categories", [filters.category])
  if (filters.verification) {
    query = query.eq("verification_status", filters.verification)
  }

  const { data, error } = await query.limit(60)
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizePublicSupplier)
}

export const getPublicCompanyProfile = cache(
  async (companyId: string): Promise<PublicCompanyProfile | null> => {
    const supabase = await createClient()
    const [companyResult, productResult] = await Promise.all([
      supabase
        .from("public_suppliers")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("public_products")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(12),
    ])

    if (companyResult.error || productResult.error || !companyResult.data) {
      return null
    }

    const company = normalizePublicSupplier(companyResult.data)
    const products = productResult.data ?? []
    const certifications = Array.from(
      new Set(products.flatMap((product) => product.certifications ?? []))
    ).sort()
    const categoryText =
      company.categories.length > 0
        ? company.categories.slice(0, 4).join(", ")
        : "food and FMCG products"
    const description = `${company.company_name} is a ${company.business_type || "trade company"} based in ${company.country}, supplying ${categoryText} to professional buyers.`

    return {
      company,
      products,
      productCount: productResult.count ?? products.length,
      certifications,
      description,
    }
  }
)
