import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, countries } from "@/lib/marketplace/data";

const steps = ["Personal Information", "Company Information", "Product Categories", "Export Countries", "Certifications", "Verification Status"];

export default function SupplierOnboardingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">Supplier onboarding</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 border-b border-neutral-100 py-3 last:border-b-0"><span className="flex size-7 items-center justify-center rounded-full bg-neutral-950 text-xs text-white">{index + 1}</span><span className="text-sm font-medium">{step}</span></div>)}</aside>
          <form className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <section><h2 className="text-xl font-semibold">Personal Information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Input placeholder="Full name" /><Input placeholder="Business email" /></div></section>
            <section><h2 className="text-xl font-semibold">Company Information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Input placeholder="Company name" /><Input placeholder="Year established" /></div></section>
            <section><h2 className="text-xl font-semibold">Product Categories</h2><div className="mt-4 grid gap-2 sm:grid-cols-3">{categories.map((category) => <label key={category.id} className="rounded-lg border border-neutral-200 p-3 text-sm"><input type="checkbox" className="mr-2" />{category.name}</label>)}</div></section>
            <section><h2 className="text-xl font-semibold">Export Countries</h2><div className="mt-4 grid gap-2 sm:grid-cols-4">{countries.map((country) => <label key={country.code} className="rounded-lg border border-neutral-200 p-3 text-sm"><input type="checkbox" className="mr-2" />{country.name}</label>)}</div></section>
            <section><h2 className="text-xl font-semibold">Certifications</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Input placeholder="HACCP, ISO 22000, Halal..." /><Input type="file" /></div></section>
            <section className="rounded-lg bg-neutral-50 p-4"><h2 className="text-xl font-semibold">Verification Status</h2><p className="mt-2 text-sm text-neutral-600">Status: Under Review after documents are submitted.</p></section>
            <Button asChild><Link href="/dashboard/supplier">Finish Onboarding</Link></Button>
          </form>
        </div>
      </div>
    </main>
  );
}
