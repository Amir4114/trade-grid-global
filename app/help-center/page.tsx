import PageShell from "@/components/layout/PageShell";

const topics = ["Posting RFQs", "Finding verified suppliers", "Listing products", "Submitting certifications", "Managing quotations", "Admin verification workflow"];

export default function HelpCenterPage() {
  return (
    <PageShell eyebrow="Help Center" title="Marketplace support topics" description="Frontend help center for buyers, suppliers, and admins.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => <div key={topic} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">{topic}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Guidance content placeholder for the production knowledge base.</p></div>)}
      </div>
    </PageShell>
  );
}
