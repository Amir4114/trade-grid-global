import Link from "next/link";
import { ArrowUpRight, Building2, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/lib/marketplace/types";
import CountryFlag from "./CountryFlag";
import TrustScore from "./TrustScore";
import VerificationBadge from "./VerificationBadge";

type SupplierCardProps = {
  supplier: Supplier;
};

export default function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-950 text-xs font-semibold text-white">
            {supplier.logo}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-lg">{supplier.companyName}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                <CountryFlag country={supplier.country} />
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" />
                {supplier.yearsInBusiness} yrs
              </span>
            </div>
          </div>
          <VerificationBadge level={supplier.verificationLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {supplier.categories.slice(0, 3).map((category) => (
            <Badge key={category} variant="outline" className="rounded-md">
              {category}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3">
          <TrustScore score={supplier.trustScore} compact />
          <div className="text-sm">
            <div className="flex items-center gap-1 text-neutral-500">
              <Clock className="size-3.5" />
              Response
            </div>
            <div className="mt-1 font-medium text-neutral-950">{supplier.responseTime}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between bg-white">
        <span className="text-sm text-neutral-500">{supplier.city}</span>
        <Button asChild size="sm">
          <Link href={`/suppliers/${supplier.id}`}>
            View Profile
            <ArrowUpRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
