import PageShell from "@/components/layout/PageShell";

export default function AboutPage() {
  return (
    <PageShell eyebrow="About" title="A sourcing operating system for food trade" description="Trade Grid Global helps importers and exporters move from discovery to RFQ to quotation with verification and AI-assisted workflows.">
      <div className="grid gap-5 md:grid-cols-3">
        {["Supplier discovery", "RFQ workflows", "Verification and trust"].map((item) => <div key={item} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{item}</h2><p className="mt-3 text-sm leading-6 text-neutral-600">Built for global B2B food, FMCG, agriculture, raw ingredients, and ready-to-eat sourcing.</p></div>)}
      </div>
    </PageShell>
  );
}
