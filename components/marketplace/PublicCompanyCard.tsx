import Link from "next/link"
import { ArrowUpRight, Building2, MapPin, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PublicSupplier } from "@/lib/database/types"
import { publicCompanyPath } from "@/lib/marketplace/company-url"

export function PublicCompanyCard({ company }: { company: PublicSupplier }) {
  const initials = company.company_name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <Card className="h-full rounded-xl border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-amber-400">
            {initials}
          </div>
          <div className="min-w-0">
            <CardTitle className="line-clamp-2 text-lg">
              {company.company_name}
            </CardTitle>
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin className="size-3.5" />
              {company.country}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {company.categories.slice(0, 3).map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
          <div>
            <p className="flex items-center gap-1 text-neutral-500">
              <Building2 className="size-3.5" />
              Business
            </p>
            <p className="mt-1 truncate font-medium">{company.business_type}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-neutral-500">
              <ShieldCheck className="size-3.5" />
              Status
            </p>
            <p className="mt-1 font-medium capitalize">
              {company.verification_status.replace("_", " ")}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto justify-end bg-white">
        <Button asChild size="sm">
          <Link
            href={publicCompanyPath(company.company_name, company.company_id)}
          >
            View company
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
