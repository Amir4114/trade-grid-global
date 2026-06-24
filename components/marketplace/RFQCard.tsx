import Link from "next/link";
import { ArrowUpRight, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { RFQ } from "@/lib/marketplace/types";
import CountryFlag from "./CountryFlag";

export default function RFQCard({ rfq }: { rfq: RFQ }) {
  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 rounded-md">
              {rfq.status}
            </Badge>
            <CardTitle className="text-lg">{rfq.productName}</CardTitle>
          </div>
          <div className="text-right text-sm font-medium text-neutral-950">{rfq.quantity}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-neutral-600">
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
          <CountryFlag country={rfq.targetCountry} />
          <span className="inline-flex items-center gap-1">
            <Ship className="size-3.5" />
            {rfq.deliveryPort}
          </span>
        </div>
        <p className="line-clamp-2">{rfq.notes}</p>
      </CardContent>
      <CardFooter className="justify-between bg-white">
        <span className="text-sm text-neutral-500">{rfq.buyerCompany}</span>
        <Button asChild size="sm">
          <Link href={`/rfq/${rfq.id}`}>
            View RFQ
            <ArrowUpRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
