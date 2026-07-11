import Link from "next/link";

const sections = [
  { title: "Marketplace", links: [["Products", "/products"], ["Suppliers", "/suppliers"], ["Buyers", "/buyers"], ["RFQs", "/rfq"]] },
  { title: "Platform", links: [["Pricing", "/pricing"], ["Categories", "/categories"], ["Countries", "/countries"], ["Verification", "/verification"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Help Center", "/help-center"], ["AI Assistant", "/ai-sourcing"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="text-lg font-semibold">Trade Grid Global</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-neutral-300">
            A premium B2B sourcing platform for importers, exporters, manufacturers, wholesalers, distributors, and buyers in Food and FMCG.
          </p>
        </div>
        {sections.map((section) => (
          <div key={section.title} className="space-y-2 text-sm text-neutral-300">
            <div className="font-semibold text-white">{section.title}</div>
            {section.links.map(([label, href]) => <Link key={href} className="block hover:text-white" href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
    </footer>
  );
}
