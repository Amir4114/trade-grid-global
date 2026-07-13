import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CountryFlag from "@/components/marketplace/CountryFlag";
import TrustScore from "@/components/marketplace/TrustScore";
import VerificationBadge from "@/components/marketplace/VerificationBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProductById, getSupplierForProduct } from "@/lib/marketplace/data";
import type { PublicProduct } from "@/lib/database/types";
import { getPublicProductById } from "@/lib/products/service";
import {
  displayIncoterms,
  displayLeadTime,
  displayMoq,
  displayPrice,
} from "@/lib/products/trade-data";
import { mapVerificationState } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const realProduct = await getPublicProductById(supabase, id);

  if (realProduct) {
    return <RealProductDetail product={realProduct} />;
  }

  // Transitional fallback: legacy marketing pages still link to non-UUID mock
  // product ids (e.g. "product-1"). Real published products always take
  // precedence above, and this branch can never surface an unpublished product
  // because getPublicProductById only reads the published-only public view.
  const mockProduct = getProductById(id);
  if (!mockProduct) notFound();

  return <MockProductDetail productId={id} />;
}

function RealProductDetail({ product }: { product: PublicProduct }) {
  const imageUrl = product.image_url || PLACEHOLDER_IMAGE;
  const gallery = product.gallery.length > 0 ? product.gallery : [];
  const specEntries = Object.entries(product.specifications ?? {});
  const verificationState = mapVerificationState(product.verification_status);
  const moqLabel = displayMoq(product);
  const leadTimeLabel = displayLeadTime(product);
  const incotermsLabel = displayIncoterms(product);
  const priceLabel = displayPrice(product);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_480px] lg:px-8">
          <div>
            <Badge variant="outline" className="rounded-md">
              {product.category}
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              {product.name}
            </h1>
            {product.description ? (
              <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
                {product.description}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-700">
              {moqLabel !== "On request" ? (
                <span className="rounded-lg bg-neutral-100 px-3 py-2">
                  MOQ {moqLabel}
                </span>
              ) : null}
              {leadTimeLabel ? (
                <span className="rounded-lg bg-neutral-100 px-3 py-2">
                  Lead time {leadTimeLabel}
                </span>
              ) : null}
              {product.country_of_origin ? (
                <span className="rounded-lg bg-neutral-100 px-3 py-2">
                  <CountryFlag country={product.country_of_origin} />
                </span>
              ) : null}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/rfq">Request Quote</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/rfq">Send Inquiry</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={product.name}
                className="h-80 w-full object-cover"
              />
            </div>
            {gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {gallery.slice(0, 6).map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image}
                    src={image}
                    alt={product.name}
                    className="h-24 w-full rounded-lg border border-neutral-200 object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-lg bg-white">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold">Specifications</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {specEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm text-neutral-500">{key}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
                {product.packaging ? (
                  <div>
                    <dt className="text-sm text-neutral-500">Packaging</dt>
                    <dd className="mt-1 font-medium">{product.packaging}</dd>
                  </div>
                ) : null}
                {incotermsLabel ? (
                  <div>
                    <dt className="text-sm text-neutral-500">Incoterms</dt>
                    <dd className="mt-1 font-medium">{incotermsLabel}</dd>
                  </div>
                ) : null}
                {product.hs_code ? (
                  <div>
                    <dt className="text-sm text-neutral-500">HS code</dt>
                    <dd className="mt-1 font-medium">{product.hs_code}</dd>
                  </div>
                ) : null}
                {priceLabel ? (
                  <div>
                    <dt className="text-sm text-neutral-500">Indicative price</dt>
                    <dd className="mt-1 font-medium">{priceLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          {product.certifications.length > 0 ? (
            <Card className="rounded-lg bg-white">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold">Certifications</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.certifications.map((item) => (
                    <Badge key={item} className="rounded-md">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Supplier</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-sm font-semibold text-white">
                {product.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{product.company_name}</div>
                <div className="mt-1">
                  <VerificationBadge state={verificationState} />
                </div>
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              {product.company_country ? (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Country</dt>
                  <dd className="font-medium">
                    <CountryFlag country={product.company_country} />
                  </dd>
                </div>
              ) : null}
              {product.business_type ? (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Business type</dt>
                  <dd className="font-medium">{product.business_type}</dd>
                </div>
              ) : null}
              {product.year_established ? (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Established</dt>
                  <dd className="font-medium">{product.year_established}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <p className="mt-4 text-sm text-neutral-600">
            Send an RFQ to receive commercial pricing, documentation, and
            certifications directly from this supplier.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href="/rfq">Request Quote</Link>
          </Button>
        </aside>
      </section>
      <Footer />
    </main>
  );
}

function MockProductDetail({ productId }: { productId: string }) {
  const product = getProductById(productId);
  if (!product) notFound();
  const supplier = getSupplierForProduct(product);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_480px] lg:px-8">
          <div>
            <Badge variant="outline" className="rounded-md">{product.category}</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{product.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">{product.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-700"><span className="rounded-lg bg-neutral-100 px-3 py-2">MOQ {product.moq}</span><span className="rounded-lg bg-neutral-100 px-3 py-2">Lead time {product.leadTime}</span><span className="rounded-lg bg-neutral-100 px-3 py-2"><CountryFlag country={product.country} /></span></div>
            <Button asChild className="mt-8"><Link href="/rfq">Request Quote</Link></Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="grid gap-3"><div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"><img src={product.image} alt={product.name} className="h-80 w-full object-cover" /></div><div className="grid grid-cols-2 gap-3">{product.gallery.map((image) => <img key={image} src={image} alt={product.name} className="h-28 rounded-lg border border-neutral-200 object-cover" />)}</div></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-lg bg-white"><CardContent className="p-6"><h2 className="text-2xl font-semibold">Specifications</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2">{Object.entries(product.specifications).map(([key, value]) => <div key={key}><dt className="text-sm text-neutral-500">{key}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}<div><dt className="text-sm text-neutral-500">Packaging</dt><dd className="mt-1 font-medium">{product.packaging}</dd></div><div><dt className="text-sm text-neutral-500">MOQ</dt><dd className="mt-1 font-medium">{product.moq}</dd></div></dl></CardContent></Card>
          <Card className="rounded-lg bg-white"><CardContent className="p-6"><h2 className="text-2xl font-semibold">Certifications</h2><div className="mt-4 flex flex-wrap gap-2">{product.certifications.map((item) => <Badge key={item} className="rounded-md">{item}</Badge>)}</div></CardContent></Card>
        </div>
        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Supplier Information</h2>
          {supplier ? <div className="mt-4 space-y-4"><div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-white">{supplier.logo}</div><div><Link href={`/suppliers/${supplier.id}`} className="font-semibold hover:underline">{supplier.companyName}</Link><div className="mt-1"><VerificationBadge state={supplier.verificationState} /></div></div></div><TrustScore score={supplier.trustScore} compact /><Button asChild className="w-full"><Link href="/rfq">RFQ Button</Link></Button><Button asChild variant="outline" className="w-full"><Link href={`/suppliers/${supplier.id}`}>View Supplier</Link></Button></div> : null}
        </aside>
      </section>
      <Footer />
    </main>
  );
}
