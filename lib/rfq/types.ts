import type { Rfq, RfqInvite, RfqStatus, RfqVisibility } from "@/lib/database/types";

export const RFQ_CATEGORIES = [
  "Rice",
  "Spices",
  "Pulses",
  "Frozen Foods",
  "Dairy",
  "Meat",
  "Poultry",
  "Seafood",
  "Fruits",
  "Vegetables",
  "Beverages",
  "Snacks",
  "Oils",
  "FMCG",
  "Food Ingredients",
  "Food Packaging",
] as const;

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  draft: "Draft",
  open: "Open",
  quoted: "Quoted",
  awarded: "Awarded",
  closed: "Closed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const RFQ_VISIBILITY_LABELS: Record<RfqVisibility, string> = {
  public: "Public",
  verified_suppliers_only: "Verified suppliers only",
  invite_only: "Invite only",
};

export type RfqFormValues = {
  title: string;
  product_name: string;
  category: string;
  description: string;
  quantity_value: string;
  quantity_unit: string;
  packaging_requirement: string;
  target_country: string;
  delivery_port: string;
  required_certifications: string;
  preferred_incoterms: string;
  quote_deadline_at: string;
  notes: string;
  visibility: RfqVisibility;
  invite_supplier_ids: string[];
};

export const EMPTY_RFQ_FORM: RfqFormValues = {
  title: "",
  product_name: "",
  category: "Rice",
  description: "",
  quantity_value: "",
  quantity_unit: "MT",
  packaging_requirement: "",
  target_country: "",
  delivery_port: "",
  required_certifications: "",
  preferred_incoterms: "",
  quote_deadline_at: "",
  notes: "",
  visibility: "verified_suppliers_only",
  invite_supplier_ids: [],
};

export type BuyerRfqListItem = Rfq & {
  invite_count: number;
};

export type SupplierRfqListItem = Rfq & {
  buyer_company_name: string | null;
};

export type RfqDetail = {
  rfq: Rfq;
  invites: RfqInvite[];
  events: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    from_status: string | null;
    to_status: string | null;
    message: string | null;
    created_at: string;
  }>;
};

export function canPublishRfq(rfq: Rfq): boolean {
  return rfq.status === "draft";
}

export function canEditDraftRfq(rfq: Rfq): boolean {
  return rfq.status === "draft";
}

export function canCloseRfq(rfq: Rfq): boolean {
  return rfq.status === "open" || rfq.status === "quoted";
}

export function canCancelRfq(rfq: Rfq): boolean {
  return rfq.status === "draft" || rfq.status === "open" || rfq.status === "quoted";
}

export function parseCsvList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatQuantity(rfq: Rfq): string {
  if (rfq.quantity_value == null) {
    return rfq.quantity_unit || "—";
  }
  return `${rfq.quantity_value}${rfq.quantity_unit ? ` ${rfq.quantity_unit}` : ""}`;
}
