import Link from "next/link";
import { Bot, CheckCircle2, Search, ShieldCheck, TrendingUp } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProductCard from "@/components/marketplace/ProductCard";
import RFQCard from "@/components/marketplace/RFQCard";
import SearchBar from "@/components/marketplace/SearchBar";
import SectionHeader from "@/components/marketplace/SectionHeader";
import SupplierCard from "@/components/marketplace/SupplierCard";
import { Button } from "@/components/ui/button";
import { categories, products, rfqs, suppliers } from "@/lib/marketplace/data";

export default function Home() {
  const premiumSuppliers = suppliers.filter((supplier) => supplier.verificationLevel === "premium").slice(0, 3);
  const featuredProducts = products.slice(0, 4);
  const latestRfqs = rfqs.slice(0, 4);

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700">
              <ShieldCheck className="size-4" />
              Verified sourcing for global food trade
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">Trade Grid Global</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Discover suppliers, source food products, post RFQs, and use AI-assisted matching across food, FMCG, agriculture, raw ingredients, and ready-to-eat categories.
            </p>
            <form action="/products" className="mt-8 max-w-2xl rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <SearchBar className="flex-1" placeholder="Search rice, spices, frozen chicken, dairy..." />
                <Button className="h-11 px-5"><Search />Search</Button>
              </div>
            </form>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4 text-sm">
              <div><div className="text-2xl font-semibold">50</div><div className="text-neutral-500">Suppliers</div></div>
              <div><div className="text-2xl font-semibold">100</div><div className="text-neutral-500">Products</div></div>
              <div><div className="text-2xl font-semibold">20</div><div className="text-neutral-500">RFQs</div></div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            <img src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80" alt="Global food logistics warehouse" className="h-full min-h-96 w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Categories" title="Focused food trade categories" description="Phase 1 stays focused on high-demand food and FMCG sourcing lanes." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`} className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-semibold">{category.name}</div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-neutral-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <SectionHeader eyebrow="Verified Suppliers" title="Supplier discovery built on trust" />
            <Button asChild variant="outline"><Link href="/suppliers">View all</Link></Button>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {premiumSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader eyebrow="Featured Products" title="Export-ready products" />
          <Button asChild variant="outline"><Link href="/products">Browse products</Link></Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="bg-neutral-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <SectionHeader eyebrow="Latest RFQs" title="Live buyer demand" />
            <Button asChild variant="outline"><Link href="/rfq">Post RFQ</Link></Button>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {latestRfqs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-lg bg-neutral-950 p-8 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300"><Bot className="size-4" />AI Sourcing Assistant</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Turn a buying need into supplier, product, and RFQ recommendations.</h2>
          </div>
          <Button asChild variant="secondary" className="h-11"><Link href="/ai-sourcing">Start sourcing</Link></Button>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {["Verified company badges", "Structured RFQ workflows", "AI-ready matching architecture"].map((metric) => (
            <div key={metric} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-5">
              <CheckCircle2 className="size-5 text-neutral-950" />
              <span className="font-medium">{metric}</span>
              <TrendingUp className="ml-auto size-4 text-neutral-400" />
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
