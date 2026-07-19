import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Building2,
  CalendarDays,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from "lucide-react"

import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import ProductCard from "@/components/marketplace/ProductCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  parsePublicCompanySlug,
  publicCompanyPath,
} from "@/lib/marketplace/company-url"
import { getPublicCompanyProfile } from "@/lib/marketplace/public-company"
import { publicProductToCardView } from "@/lib/products/types"
import { createClient } from "@/lib/supabase/server"

type PageProps = { params: Promise<{ slug: string }> }

async function resolveProfile(slug: string) {
  const companyId = parsePublicCompanySlug(slug)
  if (!companyId) return null
  return getPublicCompanyProfile(companyId)
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const profile = await resolveProfile(slug)
  if (!profile) {
    return { title: "Company not found | Trade Grid Global" }
  }

  const canonical = publicCompanyPath(
    profile.company.company_name,
    profile.company.company_id
  )
  return {
    title: `${profile.company.company_name} | Trade Grid Global`,
    description: profile.description,
    alternates: { canonical },
    openGraph: {
      title: profile.company.company_name,
      description: profile.description,
      type: "profile",
      url: canonical,
    },
  }
}

export default async function PublicCompanyPage({ params }: PageProps) {
  const { slug } = await params
  const profile = await resolveProfile(slug)
  if (!profile) notFound()

  const canonicalPath = publicCompanyPath(
    profile.company.company_name,
    profile.company.company_id
  )
  if (`/company/${slug}` !== canonicalPath) redirect(canonicalPath)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const company = profile.company
  const establishedYear = Number.parseInt(company.year_established ?? "", 10)
  const yearsTrading = Number.isFinite(establishedYear)
    ? Math.max(new Date().getUTCFullYear() - establishedYear, 0)
    : null
  const initials = company.company_name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.company_name,
    description: profile.description,
    address: {
      "@type": "PostalAddress",
      addressCountry: company.country,
    },
    url: canonicalPath,
    knowsAbout: company.categories,
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-xl font-semibold text-amber-400">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1 bg-emerald-700 text-white">
                    <ShieldCheck className="size-3.5" />
                    {company.verification_status === "verified"
                      ? "Verified Company"
                      : "Marketplace Company"}
                  </Badge>
                  <Badge variant="outline">{company.business_type}</Badge>
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {company.company_name}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600 sm:text-lg">
                  {profile.description}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-neutral-50 p-4 lg:w-auto">
              {user ? (
                <Button asChild className="w-full">
                  <Link
                    href={`/contact?company=${encodeURIComponent(company.company_id)}`}
                  >
                    Contact company
                  </Link>
                </Button>
              ) : (
                <>
                  <Button className="w-full" disabled>
                    Contact company
                  </Button>
                  <p className="mt-2 text-center text-xs leading-5 text-neutral-600">
                    Create a free account to contact this company.
                  </p>
                  <Button asChild variant="link" className="mt-1 w-full">
                    <Link href="/start-trading">Start Trading</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="company-statistics">
          <h2 id="company-statistics" className="sr-only">
            Company statistics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Country",
                value: company.country,
                icon: MapPin,
              },
              {
                label: "Published Products",
                value: String(profile.productCount),
                icon: PackageCheck,
              },
              {
                label: "Categories",
                value: String(company.categories.length),
                icon: Building2,
              },
              {
                label: "Years Trading",
                value:
                  yearsTrading === null ? "Not listed" : String(yearsTrading),
                icon: CalendarDays,
              },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
                >
                  <Icon className="size-5 text-amber-700" aria-hidden="true" />
                  <p className="mt-4 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Categories and markets</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {company.categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-neutral-600">
              Export and target-market availability is shared during a qualified
              company inquiry.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Certifications</h2>
            {profile.certifications.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.certifications.map((certification) => (
                  <Badge
                    key={certification}
                    className="bg-neutral-950 text-white"
                  >
                    {certification}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No product certifications are publicly listed.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-products">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-amber-700 uppercase">
                Marketplace catalog
              </p>
              <h2 id="recent-products" className="mt-2 text-2xl font-semibold">
                Recent products
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link
                href={`/products?q=${encodeURIComponent(company.company_name)}`}
              >
                Browse marketplace
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {profile.products.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={publicProductToCardView(product)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-6">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Future verified marketplace activity will appear here. No inferred
            transactions or performance claims are displayed.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  )
}
