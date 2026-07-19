import Link from "next/link"
import { cookies } from "next/headers"
import { LockKeyhole } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import ProductCard from "@/components/marketplace/ProductCard"
import RFQCard from "@/components/marketplace/RFQCard"
import SupplierCard from "@/components/marketplace/SupplierCard"
import BuyerCard from "@/components/profiles/BuyerCard"
import { Button } from "@/components/ui/button"
import { buyers, products, rfqs, suppliers } from "@/lib/marketplace/data"
import {
  GUEST_SESSION_COOKIE,
  verifyGuestSessionToken,
} from "@/lib/guest/session"

export default async function MarketplacePage() {
  const cookieStore = await cookies()
  const guestToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value
  let guestSession = null

  try {
    guestSession = verifyGuestSessionToken(guestToken)
  } catch {
    guestSession = null
  }

  return (
    <PageShell
      eyebrow="Marketplace"
      title="Global food trade marketplace"
      description="One workspace for supplier discovery, product sourcing, buyer demand, and RFQ matching."
    >
      <div className="grid gap-8">
        {guestSession ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                Guest access · {guestSession.name}
              </p>
              <p className="mt-1 text-amber-900/80">
                Read-only marketplace browsing is active. Create an account to
                use dashboards or trading workflows.
              </p>
            </div>
            <LockKeyhole className="size-5 shrink-0" />
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-4">
          {[
            ["Products", products.length, "/products"],
            ["Suppliers", suppliers.length, "/suppliers"],
            ["Buyers", buyers.length, "/buyers"],
            ["RFQs", rfqs.length, "/rfq"],
          ].map(([label, value, href]) => (
            <Link
              key={label}
              href={String(href)}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md"
            >
              <div className="text-sm text-neutral-500">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </Link>
          ))}
        </div>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Verified suppliers</h2>
            <Button asChild variant="outline">
              <Link href="/suppliers">View all</Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {suppliers.slice(0, 3).map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Featured products</h2>
            <Button asChild variant="outline">
              <Link href="/products">Browse</Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Active buyers</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {buyers.slice(0, 2).map((buyer) => (
                <BuyerCard key={buyer.id} buyer={buyer} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Latest RFQs</h2>
            <div className="grid gap-5">
              {rfqs.slice(0, 2).map((rfq) => (
                <RFQCard key={rfq.id} rfq={rfq} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
