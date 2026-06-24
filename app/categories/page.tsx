import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { categories } from "@/lib/marketplace/data";

export default function CategoriesPage() {
  return (
    <PageShell eyebrow="Categories" title="Food and FMCG categories" description="Phase 1 focuses only on food products, FMCG, agriculture, raw ingredients, and ready-to-eat products.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {categories.map((category) => (
          <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md">
            <div className="text-lg font-semibold">{category.name}</div>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{category.description}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
