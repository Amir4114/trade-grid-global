"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import RfqFormFields from "@/components/rfq/RfqFormFields"
import DashboardPanel from "@/components/dashboard/DashboardPanel"
import DashboardShell from "@/components/dashboard/DashboardShell"
import { Button } from "@/components/ui/button"
import { useCompany } from "@/contexts/AuthProvider"
import { isOnboardingComplete } from "@/lib/auth/redirects"
import { createDraftRfq } from "@/lib/rfq/service"
import { EMPTY_RFQ_FORM, type RfqFormValues } from "@/lib/rfq/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"

export default function BuyerCreateRfqPage() {
  const router = useRouter()
  const { company } = useCompany()
  const supabase = useMemo(() => createClient(), [])
  const [values, setValues] = useState<RfqFormValues>(EMPTY_RFQ_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onboardingComplete = isOnboardingComplete(company)

  const onSubmit = async () => {
    if (!values.title.trim() || !values.product_name.trim()) {
      setError("Title and product name are required.")
      return
    }
    if (
      values.visibility === "invite_only" &&
      values.invite_supplier_ids.length === 0
    ) {
      setError("Invite-only RFQs need at least one supplier company ID.")
      return
    }

    try {
      setBusy(true)
      setError(null)
      const rfq = await createDraftRfq(supabase, values)
      toast.success("Draft RFQ saved.")
      router.push(`/dashboard/buyer/rfqs/${rfq.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create RFQ.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardShell
      role="buyer"
      title="Create RFQ"
      description="Save a draft buying request. Publish when specifications and visibility are ready."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/buyer/rfqs">Back to My RFQs</Link>
        </Button>
      }
    >
      {!onboardingComplete ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete onboarding before you can publish. Draft creation remains
          available in your private workspace.
        </div>
      ) : null}

      <DashboardPanel title="RFQ details">
        <RfqFormFields values={values} onChange={setValues} disabled={busy} />
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void onSubmit()} disabled={busy}>
            {busy ? "Saving..." : "Save draft"}
          </Button>
          <Button asChild variant="outline" disabled={busy}>
            <Link href="/dashboard/buyer/rfqs">Cancel</Link>
          </Button>
        </div>
      </DashboardPanel>
    </DashboardShell>
  )
}
