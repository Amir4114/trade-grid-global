import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CountryFlag from "@/components/marketplace/CountryFlag";
import VerificationBadge from "@/components/marketplace/VerificationBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRFQById, quotes, suppliers } from "@/lib/marketplace/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RFQDetailPage({ params }: PageProps) {
  const { id } = await params;
  const rfq = getRFQById(id);

  if (!rfq) {
    notFound();
  }

  const rfqQuotes = quotes.filter((quote) => quote.rfqId === rfq.id);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Badge variant="outline" className="rounded-md">{rfq.status}</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{rfq.productName}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">{rfq.notes}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">RFQ Details</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-neutral-500">Quantity</dt><dd className="mt-1 font-medium">{rfq.quantity}</dd></div>
              <div><dt className="text-sm text-neutral-500">Target Country</dt><dd className="mt-1 font-medium"><CountryFlag country={rfq.targetCountry} /></dd></div>
              <div><dt className="text-sm text-neutral-500">Packaging</dt><dd className="mt-1 font-medium">{rfq.packagingRequirement}</dd></div>
              <div><dt className="text-sm text-neutral-500">Delivery Port</dt><dd className="mt-1 font-medium">{rfq.deliveryPort}</dd></div>
              <div><dt className="text-sm text-neutral-500">Buyer</dt><dd className="mt-1 font-medium">{rfq.buyerCompany}</dd></div>
              <div><dt className="text-sm text-neutral-500">Created</dt><dd className="mt-1 font-medium">{rfq.createdAt}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">Supplier Quotes</h2>
            <div className="mt-5 space-y-3">
              {rfqQuotes.map((quote) => {
                const supplier = suppliers.find((item) => item.id === quote.supplierId);
                return (
                  <div key={quote.id} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{supplier?.companyName}</div>
                      {supplier ? <VerificationBadge level={supplier.verificationLevel} /> : null}
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-neutral-600 sm:grid-cols-3">
                      <span>{quote.price}</span>
                      <span>{quote.leadTime}</span>
                      <span>{quote.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <form className="h-fit space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Submit Quote</h2>
          <Input name="supplierCompany" placeholder="Supplier company" />
          <Input name="price" placeholder="Indicative price" />
          <Input name="leadTime" placeholder="Lead time" />
          <textarea name="notes" className="min-h-28 w-full rounded-lg border border-neutral-300 p-3 text-sm" placeholder="Quote notes" />
          <Button className="w-full">Send Quote</Button>
        </form>
      </section>
      <Footer />
    </main>
  );
}
