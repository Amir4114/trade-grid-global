import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SectionHeader from "@/components/marketplace/SectionHeader";
import VerificationBadge from "@/components/marketplace/VerificationBadge";
import { Card, CardContent } from "@/components/ui/card";

const levels = [
  {
    level: "basic" as const,
    title: "Basic",
    description: "Company profile is listed with standard business information and category coverage.",
    checks: ["Company identity", "Country and category mapping", "Marketplace profile completeness"],
  },
  {
    level: "verified" as const,
    title: "Verified",
    description: "Business documents, certificates, and trade readiness are reviewed for buyer confidence.",
    checks: ["Business registration", "Food safety certificates", "Export contact validation"],
  },
  {
    level: "premium" as const,
    title: "Premium Verified",
    description: "Enhanced verification for high-intent suppliers with stronger proof, references, and trust signals.",
    checks: ["Document review", "Trade references", "Priority supplier ranking"],
  },
];

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Company Verification" title="Trust badges for safer global food trade" description="Verification levels help buyers understand supplier readiness, documentation strength, and marketplace trust signals." />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {levels.map((item) => (
            <Card key={item.level} className="rounded-lg bg-white">
              <CardContent className="p-6">
                <VerificationBadge level={item.level} />
                <h2 className="mt-5 text-2xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{item.description}</p>
                <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                  {item.checks.map((check) => (
                    <li key={check} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-neutral-950" />
                      {check}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
