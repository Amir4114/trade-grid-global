import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Buyer", price: "Free", details: "Search suppliers, post RFQs, save suppliers, and manage inquiries." },
  { name: "Supplier Pro", price: "Custom", details: "Company profile, product listings, RFQ access, quotations, and analytics." },
  { name: "Verified Growth", price: "Custom", details: "Gold verification, priority visibility, certification management, and buyer matching." },
];

export default function PricingPage() {
  return (
    <PageShell eyebrow="Pricing" title="Plans for buyers and suppliers" description="Frontend pricing placeholders for the future commercial model.">
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <div className="mt-4 text-4xl font-semibold">{plan.price}</div>
            <p className="mt-4 min-h-20 text-sm leading-6 text-neutral-600">{plan.details}</p>
            <Button asChild className="mt-6 w-full"><Link href="/signup">Get Started</Link></Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
