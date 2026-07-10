import Link from "next/link";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { suppliers } from "@/lib/marketplace/data";

export default function BuyerSuppliersPage() {
  return (
    <DashboardShell
      role="buyer"
      title="Saved Suppliers"
      description="Shortlisted exporters you trust for repeat sourcing."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {suppliers.slice(0, 9).map((supplier) => (
          <DashboardPanel key={supplier.id}>
            <h3 className="text-base font-semibold text-neutral-950">
              {supplier.companyName}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {supplier.country} · Trust score {supplier.trustScore}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
              {supplier.overview}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={`/suppliers/${supplier.id}`}>View profile</Link>
            </Button>
          </DashboardPanel>
        ))}
      </div>
    </DashboardShell>
  );
}
