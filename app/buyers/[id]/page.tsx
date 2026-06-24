import { notFound } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import RFQCard from "@/components/marketplace/RFQCard";
import VerificationBadge from "@/components/marketplace/VerificationBadge";
import { Badge } from "@/components/ui/badge";
import { getBuyerById, getBuyerRFQs } from "@/lib/marketplace/data";

type PageProps = { params: Promise<{ id: string }> };

export default async function BuyerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const buyer = getBuyerById(id);
  if (!buyer) notFound();
  const recentRfqs = getBuyerRFQs(buyer.id);

  return (
    <PageShell eyebrow="Buyer Profile" title={buyer.companyName} description={buyer.overview}>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Import Interests</h2>
            <div className="mt-4 flex flex-wrap gap-2">{buyer.importInterests.map((item) => <Badge key={item} className="rounded-md">{item}</Badge>)}</div>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Recent RFQs</h2>
            <div className="grid gap-5 md:grid-cols-2">{recentRfqs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)}</div>
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <VerificationBadge state={buyer.verificationState} />
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-neutral-500">Country</dt><dd className="font-medium">{buyer.country}</dd></div>
            <div><dt className="text-neutral-500">City</dt><dd className="font-medium">{buyer.city}</dd></div>
            <div><dt className="text-neutral-500">Annual Purchase Volume</dt><dd className="font-medium">{buyer.annualPurchaseVolume}</dd></div>
            <div><dt className="text-neutral-500">Target Countries</dt><dd className="font-medium">{buyer.targetCountries.join(", ")}</dd></div>
          </dl>
        </aside>
      </div>
    </PageShell>
  );
}
