import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import CountryFlag from "@/components/marketplace/CountryFlag";
import { countries, suppliers } from "@/lib/marketplace/data";

export default function CountriesPage() {
  return (
    <PageShell eyebrow="Countries" title="Trade lanes by country" description="Browse active sourcing and supplier markets across priority launch regions.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {countries.map((country) => {
          const count = suppliers.filter((supplier) => supplier.country === country.name).length;
          return (
            <Link key={country.code} href={`/suppliers?country=${encodeURIComponent(country.name)}`} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md">
              <div className="text-lg font-semibold"><CountryFlag country={country.name} /></div>
              <div className="mt-3 text-sm text-neutral-500">{country.region}</div>
              <div className="mt-4 text-2xl font-semibold">{count}</div>
              <div className="text-sm text-neutral-500">listed suppliers</div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
