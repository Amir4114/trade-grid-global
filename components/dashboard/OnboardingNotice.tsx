"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isOnboardingComplete } from "@/lib/auth/redirects";
import { getOnboardingPathForRole } from "@/lib/dashboard/roles";
import type { Company } from "@/lib/database/types";
import type { UserRole } from "@/lib/marketplace/types";

type OnboardingNoticeProps = {
  role: UserRole;
  company: Company | null;
};

export default function OnboardingNotice({ role, company }: OnboardingNoticeProps) {
  if (role === "admin" || isOnboardingComplete(company)) {
    return null;
  }

  const ctaLabel =
    role === "buyer" ? "Complete Buyer Profile" : "Complete Supplier Profile";

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            Complete your business profile
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Finish your company profile to unlock all Trade Grid Global features.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href={getOnboardingPathForRole(role)}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
