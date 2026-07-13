import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import FilterSidebar from "@/components/marketplace/FilterSidebar";
import ProductCard from "@/components/marketplace/ProductCard";
import SectionHeader from "@/components/marketplace/SectionHeader";
import { Button } from "@/components/ui/button";
import { listPublicProducts } from "@/lib/products/service";
import { publicProductToCardView } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(
  value: string | string[] | undefined
): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function buildQuery(
  params: Record<string, string | string[] | undefined>,
  page: number
): string {
  const search = new URLSearchParams();
  for (const key of ["q", "category", "country", "certification"]) {
    const value = firstString(params[key]);
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = firstString(params.q);
  const country = firstString(params.country);
  const category = firstString(params.category);
  const certification = firstString(params.certification);
  const pageParam = Number.parseInt(firstString(params.page) ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const supabase = await createClient();
  const { rows, count, totalPages } = await listPublicProducts(
    supabase,
    { q, country, category, certification },
    { page }
  );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Product Directory"
            title="Source export-ready food products"
            description="Browse published products across food, FMCG, agriculture, raw ingredients, and ready-to-eat supply categories."
          />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <FilterSidebar
          searchParams={params}
          showCertification
          basePath="/products"
        />
        <div>
          <div className="mb-4 text-sm text-neutral-600">
            {count} {count === 1 ? "product" : "products"} found
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-12 text-center">
              <h3 className="text-base font-semibold text-neutral-900">
                No products match your search
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
                Try clearing filters or broadening your search. Published
                supplier products appear here as verified suppliers list their
                catalogs.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={publicProductToCardView(product)}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-8 flex items-center justify-between">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                  >
                    <Link
                      href={buildQuery(params, page - 1)}
                      aria-disabled={page <= 1}
                    >
                      Previous
                    </Link>
                  </Button>
                  <span className="text-sm text-neutral-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                  >
                    <Link
                      href={buildQuery(params, page + 1)}
                      aria-disabled={page >= totalPages}
                    >
                      Next
                    </Link>
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
