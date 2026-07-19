"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatVerificationStatus } from "@/lib/dashboard/roles"
import type { CompanyVerificationStatus } from "@/lib/database/types"
import {
  getVerificationGuidance,
  getVerificationProgress,
} from "@/lib/verification/access"

export function VerificationStatusCard({
  role,
  status,
}: {
  role: "buyer" | "supplier"
  status: CompanyVerificationStatus
}) {
  const progress = getVerificationProgress(status)
  const actionHref =
    status === "pending" || status === "rejected"
      ? `/onboarding/${role}?section=documents`
      : "/marketplace"
  const actionLabel =
    status === "pending"
      ? "Complete verification"
      : status === "rejected"
        ? "Review and resubmit"
        : status === "under_review"
          ? "Browse marketplace"
          : "Explore marketplace"

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:col-span-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-amber-400">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-neutral-500">
              Verification status
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {formatVerificationStatus(status)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {getVerificationGuidance(status)}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={actionHref}>
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-medium text-neutral-500">
          <span>Trust profile progress</span>
          <span>{progress}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-label="Verification progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  )
}
