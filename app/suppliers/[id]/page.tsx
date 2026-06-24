import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProductCard from "@/components/marketplace/ProductCard";
import TrustScore from "@/components/marketplace/TrustScore";
import VerificationBadge from "@/components/marketplace/VerificationBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupplierById, getSupplierProducts } from "@/lib/marketplace/data";

type PageProps = { params: Promise<{ id: string }> };

export default async function SupplierProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supplier = getSupplierById(id);
  if (!supplier) notFound();
  const supplierProducts = getSupplierProducts(supplier.id).slice(0, 6);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="bg-white">
        <div className="h-56 overflow-hidden bg-neutral-100"><img src={supplier.bannerImage} alt={`${supplier.companyName} banner`} className="h-full w-full object-cover" /></div>
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="-mt-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-end gap-4"><div className="flex size-24 items-center justify-center rounded-lg border-4 border-white bg-neutral-950 text-lg font-semibold text-white shadow-sm">{supplier.logo}</div><VerificationBadge state={supplier.verificationState} /></div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">{supplier.companyName}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">{supplier.overview}</p>
            </div>
            <div className="flex gap-3"><Button>Contact Supplier</Button><Button asChild variant="outline"><Link href="/rfq">Send RFQ</Link></Button></div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-10">
          <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-4">
            <div><div className="text-sm text-neutral-500">Country</div><div className="mt-1 font-semibold">{supplier.country}</div></div>
            <div><div className="text-sm text-neutral-500">Established</div><div className="mt-1 font-semibold">{supplier.yearEstablished}</div></div>
            <div><div className="text-sm text-neutral-500">Response Rate</div><div className="mt-1 font-semibold">{supplier.responseRate}%</div></div>
            <div><div className="text-sm text-neutral-500">Response Time</div><div className="mt-1 font-semibold">{supplier.responseTime}</div></div>
          </div>
          <div><h2 className="text-2xl font-semibold">Products</h2><div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{supplierProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6"><h2 className="text-2xl font-semibold">Certifications and Export Markets</h2><div className="mt-4 flex flex-wrap gap-2">{supplier.certifications.map((item) => <Badge key={item} className="rounded-md">{item}</Badge>)}</div><div className="mt-5 text-sm text-neutral-600">Exports to: {supplier.exportMarkets.join(", ")}</div></div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"><TrustScore score={supplier.trustScore} /></div>
          <form className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Contact Supplier</h2><Input placeholder="Your name" /><Input placeholder="Business email" type="email" /><Input placeholder="Product of interest" /><textarea className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm" placeholder="Tell the supplier what you need" /><Button className="w-full">Send Inquiry</Button></form>
        </aside>
      </section>
      <Footer />
    </main>
  );
}
