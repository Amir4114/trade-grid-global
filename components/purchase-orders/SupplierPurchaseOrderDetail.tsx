"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import PurchaseOrderStatusBadge from "@/components/purchase-orders/PurchaseOrderStatusBadge";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sortEventsNewestFirst } from "@/lib/purchase-orders/helpers";
import {
  acceptPurchaseOrder,
  getPurchaseOrder,
  rejectPurchaseOrder,
} from "@/lib/purchase-orders/service";
import {
  canSupplierRespond,
  formatPoLeadTime,
  formatPoMoney,
  formatPoQuantity,
  type PurchaseOrderDetail,
} from "@/lib/purchase-orders/types";
import { createClient } from "@/lib/supabase/client";

type Props = { purchaseOrderId: string };

export default function SupplierPurchaseOrderDetail({
  purchaseOrderId,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const reload = useCallback(async () => {
    const data = await getPurchaseOrder(supabase, purchaseOrderId);
    setDetail(data);
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
      <DashboardShell role="supplier" title="Purchase order" description="Loading...">
        <DashboardPanel>
          <p className="py-10 text-center text-sm text-neutral-500">Loading...</p>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell role="supplier" title="Purchase order" description="Not found">
        <DashboardPanel>
          <p className="py-10 text-center text-sm text-red-600">
            {error ?? "Purchase order not found."}
          </p>
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/supplier/orders">Back to orders</Link>
            </Button>
          </div>
        </DashboardPanel>
      </DashboardShell>
    );
  }

  const po = detail.purchase_order;
  const events = sortEventsNewestFirst(detail.events);

  return (
    <DashboardShell
      role="supplier"
      title={po.po_number}
      description={`${po.product_name} · ${po.buyer_company_name}`}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/supplier/orders">All orders</Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PurchaseOrderStatusBadge status={po.status} role="supplier" />
        <span className="text-xs text-neutral-500">
          {po.issued_at
            ? `Issued ${new Date(po.issued_at).toLocaleString()}`
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
                <dt className="text-neutral-500">Buyer</dt>
                <dd className="font-medium">{po.buyer_company_name}</dd>
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
                <dt className="text-neutral-500">Payment terms</dt>
                <dd className="font-medium">{po.payment_terms || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Destination</dt>
                <dd className="font-medium">
                  {[po.target_country, po.delivery_port]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
            {po.commercial_notes ? (
              <p className="mt-4 text-sm text-neutral-600">{po.commercial_notes}</p>
            ) : null}
          </DashboardPanel>

          <DashboardPanel title="Line items">
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
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel title="Response">
            {canSupplierRespond(po.status) ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">
                  Accepting acknowledges these commercial terms subject to the
                  Platform Terms of Service.
                </p>
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      async () => {
                        await acceptPurchaseOrder(supabase, po.id);
                      },
                      "Purchase order accepted."
                    )
                  }
                >
                  Accept purchase order
                </Button>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (required)"
                  rows={3}
                  disabled={busy}
                />
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      async () => {
                        await rejectPurchaseOrder(
                          supabase,
                          po.id,
                          rejectReason
                        );
                      },
                      "Purchase order rejected."
                    )
                  }
                >
                  Reject purchase order
                </Button>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">
                {po.status === "accepted"
                  ? "This purchase order is accepted and read-only."
                  : po.status === "rejected"
                    ? `Rejected: ${po.reject_reason ?? "—"}`
                    : po.status === "cancelled"
                      ? `Cancelled by buyer${po.cancel_reason ? `: ${po.cancel_reason}` : "."}`
                      : "No actions available."}
              </p>
            )}
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
