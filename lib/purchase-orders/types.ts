import type {
  PurchaseOrder,
  PurchaseOrderDocument,
  PurchaseOrderEvent,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from "@/lib/database/types";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> =
  {
    draft: "Draft",
    issued: "Pending supplier",
    accepted: "Accepted",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

export const SUPPLIER_PURCHASE_ORDER_STATUS_LABELS: Record<
  Exclude<PurchaseOrderStatus, "draft">,
  string
> = {
  issued: "Action required",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export type PurchaseOrderDraftUpdate = {
  payment_terms?: string;
  notes?: string;
  quantity_value?: string;
  quantity_unit?: string;
  unit_price?: string;
  total_price?: string;
  incoterm?: string;
  lead_time_min?: string;
  lead_time_max?: string;
  lead_time_unit?: string;
  delivery_port?: string;
  target_country?: string;
};

export type PurchaseOrderDetail = {
  purchase_order: PurchaseOrder;
  items: PurchaseOrderItem[];
  events: PurchaseOrderEvent[];
  documents: PurchaseOrderDocument[];
};

export type PurchaseOrderListResult = {
  rows: PurchaseOrder[];
  limit: number;
  offset: number;
};

export function formatPoMoney(
  amount: number | null,
  currency: string,
  unit?: string
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 6,
  }).format(amount);
  return unit ? `${formatted} / ${unit}` : formatted;
}

export function formatPoQuantity(
  quantity: number | null,
  unit: string
): string {
  if (quantity == null || !Number.isFinite(quantity)) return "—";
  return unit ? `${quantity} ${unit}` : String(quantity);
}

export function formatPoLeadTime(
  min: number | null,
  max: number | null,
  unit: string
): string {
  if (min == null && max == null) return "—";
  const u = unit || "days";
  if (min != null && max != null) return `${min}–${max} ${u}`;
  if (min != null) return `${min} ${u}`;
  return `${max} ${u}`;
}

export function isCommercialLocked(status: PurchaseOrderStatus): boolean {
  return status !== "draft";
}

export function canBuyerIssue(status: PurchaseOrderStatus): boolean {
  return status === "draft";
}

export function canBuyerCancel(status: PurchaseOrderStatus): boolean {
  return status === "draft" || status === "issued";
}

export function canSupplierRespond(status: PurchaseOrderStatus): boolean {
  return status === "issued";
}
