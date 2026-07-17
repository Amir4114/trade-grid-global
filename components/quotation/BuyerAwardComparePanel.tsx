"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AwardEvent, QuotationAward } from "@/lib/database/types";
import {
  formatLeadTime,
  formatMoney,
  formatMoq,
  QUOTATION_THREAD_STATUS_LABELS,
  type QuotationThreadSummary,
} from "@/lib/quotation/types";
import { cn } from "@/lib/utils";

type Props = {
  rfqStatus: string;
  requiredCertifications: string[];
  quotes: QuotationThreadSummary[];
  award: QuotationAward | null;
  awardEvents: AwardEvent[];
  busy: boolean;
  onAward: (threadId: string, notes: string) => Promise<void>;
};

function isAwardable(rfqStatus: string, quote: QuotationThreadSummary): boolean {
  if (!["open", "quoted"].includes(rfqStatus)) return false;
  if (quote.status === "withdrawn") return false;
  const offer = quote.current_offer;
  if (!offer) return false;
  return offer.status === "submitted";
}

export default function BuyerAwardComparePanel({
  rfqStatus,
  requiredCertifications,
  quotes,
  award,
  awardEvents,
  busy,
  onAward,
}: Props) {
  const [confirmThreadId, setConfirmThreadId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const confirmQuote = quotes.find((q) => q.id === confirmThreadId) ?? null;
  const certsLabel =
    requiredCertifications.length > 0
      ? requiredCertifications.join(", ")
      : "—";

  return (
    <div className="space-y-6">
      {quotes.length === 0 ? (
        <p className="text-sm text-neutral-500">No quotations received yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">MOQ</th>
                  <th className="px-4 py-3 font-semibold">Lead time</th>
                  <th className="px-4 py-3 font-semibold">Certifications</th>
                  <th className="px-4 py-3 font-semibold">Payment terms</th>
                  <th className="px-4 py-3 font-semibold">Delivery terms</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {quotes.map((quote) => {
                  const offer = quote.current_offer;
                  const winner =
                    award?.status === "active" && award.thread_id === quote.id;
                  return (
                    <tr
                      key={quote.id}
                      className={cn(winner ? "bg-amber-50/60" : "hover:bg-neutral-50")}
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {quote.supplier_company_name ?? "Supplier"}
                      </td>
                      <td className="px-4 py-3">
                        {offer ? formatMoney(offer) : "—"}
                      </td>
                      <td className="px-4 py-3">{offer ? formatMoq(offer) : "—"}</td>
                      <td className="px-4 py-3">
                        {offer ? formatLeadTime(offer) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {certsLabel}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">—</td>
                      <td className="px-4 py-3">{offer?.incoterm || "—"}</td>
                      <td className="px-4 py-3">
                        {winner
                          ? "Awarded"
                          : QUOTATION_THREAD_STATUS_LABELS[quote.status]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAwardable(rfqStatus, quote) ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setConfirmThreadId(quote.id);
                              setNotes("");
                            }}
                          >
                            Award
                          </Button>
                        ) : winner ? (
                          <span className="text-xs font-medium text-amber-800">
                            Selected
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-neutral-900">Award history</h4>
        {award ? (
          <ul className="mt-3 space-y-3 text-sm">
            <li className="rounded-lg border border-neutral-200 px-3 py-2">
              <div className="font-medium text-neutral-900">
                Award {award.status === "active" ? "(active)" : "(revoked)"}
              </div>
              <div className="text-xs text-neutral-500">
                {new Date(award.awarded_at).toLocaleString()}
                {award.notes ? ` · ${award.notes}` : ""}
              </div>
            </li>
            {awardEvents.map((event) => (
              <li key={event.id} className="border-b border-neutral-100 pb-2">
                <div className="font-medium text-neutral-900">{event.event_type}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(event.created_at).toLocaleString()}
                  {event.from_status && event.to_status
                    ? ` · ${event.from_status} → ${event.to_status}`
                    : ""}
                </div>
                {event.message ? (
                  <div className="mt-1 text-neutral-600">{event.message}</div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No awards yet.</p>
        )}
      </div>

      <Dialog
        open={Boolean(confirmThreadId)}
        onOpenChange={(open) => {
          if (!open) setConfirmThreadId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm supplier award</DialogTitle>
            <DialogDescription>
              Awarding locks this RFQ, blocks new quotations, and notifies all
              quoting suppliers. This cannot be undone without an explicit revoke.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Award{" "}
              <span className="font-medium">
                {confirmQuote?.supplier_company_name ?? "this supplier"}
              </span>
              {confirmQuote?.current_offer
                ? ` at ${formatMoney(confirmQuote.current_offer)}`
                : ""}
              ?
            </p>
            <Input
              placeholder="Optional award notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmThreadId(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !confirmThreadId}
              onClick={() => {
                if (!confirmThreadId) return;
                void (async () => {
                  await onAward(confirmThreadId, notes);
                  setConfirmThreadId(null);
                })();
              }}
            >
              Confirm award
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
