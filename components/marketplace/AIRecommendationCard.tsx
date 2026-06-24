import Link from "next/link";
import { ArrowUpRight, Bot, PackageSearch, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AIRecommendation } from "@/lib/marketplace/types";

export default function AIRecommendationCard({ recommendation }: { recommendation: AIRecommendation }) {
  const Icon = recommendation.type === "supplier" ? Bot : recommendation.type === "product" ? PackageSearch : Send;

  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm">
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-neutral-950">{recommendation.title}</div>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{recommendation.description}</p>
          <div className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{recommendation.meta}</div>
        </div>
        <Button asChild size="icon" variant="outline" aria-label={`Open ${recommendation.title}`}>
          <Link href={recommendation.href}>
            <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
