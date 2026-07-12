import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import FilterSidebar from "@/components/marketplace/FilterSidebar";
import ProductCard from "@/components/marketplace/ProductCard";
import SectionHeader from "@/components/marketplace/SectionHeader";
import { listPublishedProducts } from "@/lib/products/service";
import { productToCardView } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const country = typeof params.country === "string" ? params.country : undefined;
  const category =
    typeof params.category === "string" ? params.category : undefined;

  const supabase = await createClient();
  const products = await listPublishedProducts(supabase, {
    q,
    country,
    category,
  });

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
        <FilterSidebar searchParams={params} />
        <div>
          <div className="mb-4 text-sm text-neutral-600">
            Showing {products.length} products
          </div>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-12 text-center">
              <h3 className="text-base font-semibold text-neutral-900">
                No published products yet
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
                Published supplier products will appear here. Check back soon as
                verified suppliers list their catalogs.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={productToCardView(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
