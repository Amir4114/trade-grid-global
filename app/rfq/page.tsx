import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import RFQCard from "@/components/marketplace/RFQCard";
import SectionHeader from "@/components/marketplace/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, countries, rfqs } from "@/lib/marketplace/data";

export default function RFQPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="RFQ System" title="Post buying requirements and collect supplier quotes" description="Create structured RFQs for food and FMCG products, then compare supplier responses as the marketplace grows." />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[420px_1fr] lg:px-8">
        <form className="h-fit space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Post RFQ</h2>
          <Input name="productName" placeholder="Product Name" />
          <Input name="quantity" placeholder="Quantity" />
          <select name="targetCountry" className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            <option value="">Target Country</option>
            {countries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
          </select>
          <select name="category" className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            <option value="">Category</option>
            {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
          </select>
          <Input name="packagingRequirement" placeholder="Packaging Requirement" />
          <Input name="deliveryPort" placeholder="Delivery Port" />
          <textarea name="notes" className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm" placeholder="Notes" />
          <Button className="w-full">Submit RFQ</Button>
        </form>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Latest RFQs</h2>
            <span className="text-sm text-neutral-600">{rfqs.length} active requests</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {rfqs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
