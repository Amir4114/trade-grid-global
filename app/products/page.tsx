import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import FilterSidebar from "@/components/marketplace/FilterSidebar";
import ProductCard from "@/components/marketplace/ProductCard";
import SectionHeader from "@/components/marketplace/SectionHeader";
import { products } from "@/lib/marketplace/data";
import type { CategoryName, CountryName } from "@/lib/marketplace/types";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const country = typeof params.country === "string" ? (params.country as CountryName) : undefined;
  const category = typeof params.category === "string" ? (params.category as CategoryName) : undefined;

  const filtered = products.filter((product) => {
    const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.description.toLowerCase().includes(q);
    const matchesCountry = !country || product.country === country;
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCountry && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Product Directory" title="Source export-ready food products" description="Browse products across food, FMCG, agriculture, raw ingredients, and ready-to-eat supply categories." />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <FilterSidebar searchParams={params} />
        <div>
          <div className="mb-4 text-sm text-neutral-600">Showing {filtered.length} products</div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
