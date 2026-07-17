"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPurchaseOrderDraft } from "@/lib/purchase-orders/service";
import { createClient } from "@/lib/supabase/client";

export default function BuyerCreatePurchaseOrder() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const awardId = searchParams.get("awardId") ?? "";

  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!awardId) {
      setError("Missing award reference. Open Create PO from an awarded RFQ.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const po = await createPurchaseOrderDraft(supabase, awardId, {
        paymentTerms,
        notes,
      });
      router.push(`/dashboard/buyer/orders/${po.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create purchase order."
      );
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      role="buyer"
      title="Create purchase order"
      description="Snapshot commercial terms from the active award into a draft purchase order."
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/buyer/orders">Cancel</Link>
        </Button>
      }
    >
      <DashboardPanel title="New draft from award">
        {!awardId ? (
          <p className="text-sm text-red-600">
            Missing awardId. Return to an awarded RFQ and choose Create purchase
            order.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Award reference:{" "}
              <span className="font-mono text-xs">{awardId}</span>
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Payment terms (optional)
              </label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                disabled={busy}
                placeholder="e.g. CAD / Net 30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                rows={3}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button disabled={busy} onClick={() => void onCreate()}>
              {busy ? "Creating..." : "Create draft purchase order"}
            </Button>
          </div>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
