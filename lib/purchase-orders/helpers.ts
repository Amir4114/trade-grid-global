import type { PurchaseOrder, PurchaseOrderEvent } from "@/lib/database/types";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  SUPPLIER_PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/purchase-orders/types";

export function buyerStatusLabel(status: PurchaseOrder["status"]): string {
  return PURCHASE_ORDER_STATUS_LABELS[status] ?? status;
}

export function supplierStatusLabel(status: PurchaseOrder["status"]): string {
  if (status === "draft") return "—";
  return SUPPLIER_PURCHASE_ORDER_STATUS_LABELS[status] ?? status;
}

export function statusBadgeClass(status: PurchaseOrder["status"]): string {
  switch (status) {
    case "draft":
      return "border-neutral-300 bg-neutral-50 text-neutral-700";
    case "issued":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "accepted":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-800";
    case "cancelled":
      return "border-neutral-300 bg-neutral-100 text-neutral-600";
    default:
      return "border-neutral-300 bg-neutral-50 text-neutral-700";
  }
}

export function sortEventsNewestFirst(
  events: PurchaseOrderEvent[]
): PurchaseOrderEvent[] {
  return [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function poCounterpartyLabel(
  po: PurchaseOrder,
  role: "buyer" | "supplier"
): string {
  return role === "buyer" ? po.supplier_company_name : po.buyer_company_name;
}
