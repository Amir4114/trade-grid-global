import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Buyer } from "@/lib/marketplace/types";
import CountryFlag from "../marketplace/CountryFlag";
import VerificationBadge from "../marketplace/VerificationBadge";

export default function BuyerCard({ buyer }: { buyer: Buyer }) {
  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{buyer.companyName}</CardTitle>
            <div className="mt-2 text-sm text-neutral-600"><CountryFlag country={buyer.country} /></div>
          </div>
          <VerificationBadge state={buyer.verificationState} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {buyer.importInterests.map((item) => <Badge key={item} variant="outline" className="rounded-md">{item}</Badge>)}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1"><Globe2 className="size-4" /> Target markets</span>
          <span className="font-medium text-neutral-950">{buyer.targetCountries.length}</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between bg-white">
        <span className="text-sm text-neutral-500">{buyer.annualPurchaseVolume}</span>
        <Button asChild size="sm"><Link href={`/buyers/${buyer.id}`}>View Buyer <ArrowUpRight /></Link></Button>
      </CardFooter>
    </Card>
  );
}
