import type { PurchaseOrderDraftUpdate } from "@/lib/purchase-orders/types";

function optionalNumber(
  raw: string | undefined,
  label: string
): number | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return value;
}

export function validateRejectReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error("A rejection reason is required.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Rejection reason is too long.");
  }
  return trimmed;
}

export function validateCancelReason(reason: string | undefined): string | null {
  if (reason === undefined) return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2000) {
    throw new Error("Cancel reason is too long.");
  }
  return trimmed;
}

export function draftUpdateArgs(values: PurchaseOrderDraftUpdate) {
  return {
    p_payment_terms:
      values.payment_terms !== undefined ? values.payment_terms.trim() : undefined,
    p_notes: values.notes !== undefined ? values.notes.trim() : undefined,
    p_quantity_value: optionalNumber(values.quantity_value, "Quantity"),
    p_quantity_unit:
      values.quantity_unit !== undefined
        ? values.quantity_unit.trim()
        : undefined,
    p_unit_price: optionalNumber(values.unit_price, "Unit price"),
    p_total_price: optionalNumber(values.total_price, "Total price"),
    p_incoterm:
      values.incoterm !== undefined ? values.incoterm.trim() : undefined,
    p_lead_time_min: optionalNumber(values.lead_time_min, "Lead time min"),
    p_lead_time_max: optionalNumber(values.lead_time_max, "Lead time max"),
    p_lead_time_unit:
      values.lead_time_unit !== undefined
        ? values.lead_time_unit.trim() || "days"
        : undefined,
    p_delivery_port:
      values.delivery_port !== undefined
        ? values.delivery_port.trim()
        : undefined,
    p_target_country:
      values.target_country !== undefined
        ? values.target_country.trim()
        : undefined,
  };
}
