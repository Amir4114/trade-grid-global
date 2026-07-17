"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import PurchaseOrderStatusBadge from "@/components/purchase-orders/PurchaseOrderStatusBadge";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sortEventsNewestFirst } from "@/lib/purchase-orders/helpers";
import {
  cancelPurchaseOrder,
  getPurchaseOrder,
  issuePurchaseOrder,
  updatePurchaseOrderDraft,
} from "@/lib/purchase-orders/service";
import {
  canBuyerCancel,
  canBuyerIssue,
  formatPoLeadTime,
  formatPoMoney,
  formatPoQuantity,
  type PurchaseOrderDetail,
} from "@/lib/purchase-orders/types";
import { createClient } from "@/lib/supabase/client";

type Props = { purchaseOrderId: string };

export default function BuyerPurchaseOrderDetail({ purchaseOrderId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const reload = useCallback(async () => {
    const data = await getPurchaseOrder(supabase, purchaseOrderId);
    setDetail(data);
    if (data) {
      setPaymentTerms(data.purchase_order.payment_terms);
      setNotes(data.purchase_order.commercial_notes);
    }
  }, [supabase, purchaseOrderId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        await reload();
        if (!active) return;
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load purchase order."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  async function run(action: () => Promise<void>, success: string) {
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      await action();
      await reload();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell role="buyer" title="Purchase order" description="Loading...">
        <DashboardPanel>
          <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="buyer" title="Purchase order" description="Not found">
        <DashboardPanel>
          <p className="py-10 text-center text-sm text-red-600">
            {error ?? "Purchase order not found."}
          </p>
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/buyer/orders">Back to orders</Link>
            </Button>
          </div>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  const po = detail.purchase_order;
  const events = sortEventsNewestFirst(detail.events);
  const locked = !canBuyerIssue(po.status);

  return (
    <DashboardShell
      role="buyer"
      title={po.po_number}
      description={`${po.product_name} · ${po.supplier_company_name}`}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/buyer/orders">All orders</Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PurchaseOrderStatusBadge status={po.status} />
        <span className="text-xs text-neutral-500">
          Revision {po.revision_no}
          {po.issued_at
            ? ` · Issued ${new Date(po.issued_at).toLocaleString()}`
            : ""}
        </span>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mb-4 text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DashboardPanel title="Commercial terms">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Supplier</dt>
                <dd className="font-medium">{po.supplier_company_name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Quantity</dt>
                <dd className="font-medium">
                  {formatPoQuantity(po.quantity_value, po.quantity_unit)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Unit price</dt>
                <dd className="font-medium">
                  {formatPoMoney(po.unit_price, po.currency, po.price_unit)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Total</dt>
                <dd className="font-medium">
                  {formatPoMoney(po.total_price, po.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Incoterm</dt>
                <dd className="font-medium">{po.incoterm || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Lead time</dt>
                <dd className="font-medium">
                  {formatPoLeadTime(
                    po.lead_time_min,
                    po.lead_time_max,
                    po.lead_time_unit
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Destination</dt>
                <dd className="font-medium">
                  {[po.target_country, po.delivery_port]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Award reference</dt>
                <dd className="font-mono text-xs">{po.award_id}</dd>
              </div>
            </dl>

            {po.status === "draft" ? (
              <div className="mt-6 space-y-3 border-t border-neutral-100 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Payment terms
                  </label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    disabled={busy}
                    placeholder="e.g. Net 30 against documents"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Notes
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={busy}
                    rows={3}
                  />
                </div>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    void run(
                      async () => {
                        await updatePurchaseOrderDraft(supabase, po.id, {
                          payment_terms: paymentTerms,
                          notes,
                        });
                      },
                      "Draft updated."
                    )
                  }
                >
                  Save draft
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-neutral-500">Payment terms: </span>
                  {po.payment_terms || "—"}
                </p>
                <p>
                  <span className="text-neutral-500">Notes: </span>
                  {po.commercial_notes || "—"}
                </p>
                {locked ? (
                  <p className="text-xs text-neutral-500">
                    Commercial fields are locked after issue.
                  </p>
                ) : null}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Line items">
            {detail.items.length === 0 ? (
              <p className="text-sm text-neutral-500">No line items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Qty</th>
                      <th className="py-2 pr-3">Unit price</th>
                      <th className="py-2">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id} className="border-t border-neutral-100">
                        <td className="py-2 pr-3">{item.line_no}</td>
                        <td className="py-2 pr-3">{item.product_name}</td>
                        <td className="py-2 pr-3">
                          {formatPoQuantity(
                            item.quantity_value,
                            item.quantity_unit
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {formatPoMoney(
                            item.unit_price,
                            item.currency,
                            item.price_unit
                          )}
                        </td>
                        <td className="py-2">
                          {formatPoMoney(item.line_total, item.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel title="Actions">
            <div className="space-y-3">
              {canBuyerIssue(po.status) ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      async () => {
                        await issuePurchaseOrder(supabase, po.id);
                      },
                      "Purchase order issued to supplier."
                    )
                  }
                >
                  Issue purchase order
                </Button>
              ) : null}

              {canBuyerCancel(po.status) ? (
                <div className="space-y-2">
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancel reason (optional)"
                    rows={2}
                    disabled={busy}
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        async () => {
                          await cancelPurchaseOrder(
                            supabase,
                            po.id,
                            cancelReason
                          );
                        },
                        "Purchase order cancelled."
                      )
                    }
                  >
                    Cancel purchase order
                  </Button>
                </div>
              ) : null}

              {po.status === "accepted" ? (
                <p className="text-sm text-neutral-600">
                  Accepted purchase orders are read-only commercial baselines.
                  Fulfillment continues in later modules.
                </p>
              ) : null}

              <Button asChild variant="ghost" className="w-full">
                <Link href={`/dashboard/buyer/rfqs/${po.rfq_id}`}>
                  Open source RFQ
                </Link>
              </Button>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Parties">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-neutral-500">Buyer</div>
                <div className="font-medium">{po.buyer_company_name}</div>
                <div className="text-neutral-600">
                  {po.buyer_contact_name || "—"} · {po.buyer_contact_email || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Supplier</div>
                <div className="font-medium">{po.supplier_company_name}</div>
                <div className="text-neutral-600">
                  {po.supplier_contact_name || "—"} ·{" "}
                  {po.supplier_contact_email || "—"}
                </div>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Timeline">
            {events.length === 0 ? (
              <p className="text-sm text-neutral-500">No events yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {events.map((event) => (
                  <li key={event.id} className="border-b border-neutral-100 pb-2">
                    <div className="font-medium text-neutral-900">
                      {event.event_type}
                    </div>
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
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardShell>
  );
}
