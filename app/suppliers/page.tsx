import Link from "next/link"
import { Building2 } from "lucide-react"

import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import FilterSidebar from "@/components/marketplace/FilterSidebar"
import { PublicCompanyCard } from "@/components/marketplace/PublicCompanyCard"
import SectionHeader from "@/components/marketplace/SectionHeader"
import { Button } from "@/components/ui/button"
import { listPublicCompanies } from "@/lib/marketplace/public-company"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const companies = await listPublicCompanies({
    q: firstString(params.q),
    country: firstString(params.country),
    category: firstString(params.category),
    verification: firstString(params.verification),
  })

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Company Directory"
            title="Find food and FMCG trade companies"
            description="Discover companies with published marketplace catalogs across global sourcing categories."
          />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <FilterSidebar
          searchParams={params}
          showVerification
          basePath="/suppliers"
        />
        <div>
          <div className="mb-4 text-sm text-neutral-600">
            {companies.length}{" "}
            {companies.length === 1 ? "company" : "companies"} found
          </div>
          {companies.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {companies.map((company) => (
                <PublicCompanyCard key={company.company_id} company={company} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <Building2 className="mx-auto size-8 text-neutral-400" />
              <h2 className="mt-4 text-lg font-semibold">No companies found</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Clear your filters or browse published marketplace products.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/suppliers">Clear filters</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
