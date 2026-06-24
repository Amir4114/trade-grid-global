import PageShell from "@/components/layout/PageShell";
import BuyerCard from "@/components/profiles/BuyerCard";
import { buyers } from "@/lib/marketplace/data";

export default function BuyersPage() {
  return (
    <PageShell eyebrow="Buyers" title="Importer and buyer directory" description="Discover active buying companies, import interests, target markets, and recent sourcing behavior.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {buyers.map((buyer) => <BuyerCard key={buyer.id} buyer={buyer} />)}
      </div>
    </PageShell>
  );
}
