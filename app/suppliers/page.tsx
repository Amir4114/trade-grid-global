import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import FilterSidebar from "@/components/marketplace/FilterSidebar";
import SectionHeader from "@/components/marketplace/SectionHeader";
import SupplierCard from "@/components/marketplace/SupplierCard";
import { suppliers } from "@/lib/marketplace/data";
import type { CategoryName, CountryName, VerificationLevel } from "@/lib/marketplace/types";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuppliersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const country = typeof params.country === "string" ? (params.country as CountryName) : undefined;
  const category = typeof params.category === "string" ? (params.category as CategoryName) : undefined;
  const verification = typeof params.verification === "string" ? (params.verification as VerificationLevel) : undefined;

  const filtered = suppliers.filter((supplier) => {
    const matchesSearch = !q || supplier.companyName.toLowerCase().includes(q) || supplier.categories.some((item) => item.toLowerCase().includes(q));
    const matchesCountry = !country || supplier.country === country;
    const matchesCategory = !category || supplier.categories.includes(category);
    const matchesVerification = !verification || supplier.verificationLevel === verification;
    return matchesSearch && matchesCountry && matchesCategory && matchesVerification;
  });

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Supplier Directory" title="Find verified food and FMCG suppliers" description="Search global manufacturers, exporters, and distributors across priority food trade categories." />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <FilterSidebar searchParams={params} showVerification />
        <div>
          <div className="mb-4 text-sm text-neutral-600">Showing {filtered.length} suppliers</div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
