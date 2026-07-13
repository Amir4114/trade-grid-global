import Link from "next/link";

import { Button } from "@/components/ui/button";
import { categories, countries } from "@/lib/marketplace/data";
import { certifications } from "@/lib/marketplace/certifications";
import type { VerificationLevel } from "@/lib/marketplace/types";
import SearchBar from "./SearchBar";

type FilterSidebarProps = {
  searchParams: Record<string, string | string[] | undefined>;
  showVerification?: boolean;
  showCertification?: boolean;
  basePath?: string;
};

const verificationOptions: { value: VerificationLevel; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "verified", label: "Verified" },
  { value: "premium", label: "Premium Verified" },
];

export default function FilterSidebar({
  searchParams,
  showVerification = false,
  showCertification = false,
  basePath = "/products",
}: FilterSidebarProps) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const country = typeof searchParams.country === "string" ? searchParams.country : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "";
  const verification = typeof searchParams.verification === "string" ? searchParams.verification : "";
  const certification =
    typeof searchParams.certification === "string" ? searchParams.certification : "";

  const hasActiveFilters = Boolean(
    q || country || category || verification || certification
  );

  return (
    <form action={basePath} method="get" className="space-y-5 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <SearchBar defaultValue={q} placeholder="Search directory" />
      <label className="block text-sm font-medium text-neutral-950">
        Country
        <select name="country" defaultValue={country} className="mt-2 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
          <option value="">All countries</option>
          {countries.map((item) => (
            <option key={item.code} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-neutral-950">
        Product Category
        <select name="category" defaultValue={category} className="mt-2 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {showCertification ? (
        <label className="block text-sm font-medium text-neutral-950">
          Certification
          <select name="certification" defaultValue={certification} className="mt-2 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            <option value="">All certifications</option>
            {certifications.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showVerification ? (
        <label className="block text-sm font-medium text-neutral-950">
          Verification Status
          <select name="verification" defaultValue={verification} className="mt-2 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            <option value="">All levels</option>
            {verificationOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button type="submit" className="w-full">
        Apply Filters
      </Button>
      {hasActiveFilters ? (
        <Button asChild type="button" variant="outline" className="w-full">
          <Link href={basePath}>Clear filters</Link>
        </Button>
      ) : null}
    </form>
  );
}
