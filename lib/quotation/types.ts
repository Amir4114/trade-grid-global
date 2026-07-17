import type {
  AwardEvent,
  QuotationAward,
  QuotationOffer,
  QuotationOfferStatus,
  QuotationThread,
  QuotationThreadStatus,
} from "@/lib/database/types";

export const QUOTATION_THREAD_STATUS_LABELS: Record<QuotationThreadStatus, string> = {
  draft: "Draft",
  active: "Active",
  withdrawn: "Withdrawn",
  awarded: "Awarded",
  closed: "Closed",
};

export const QUOTATION_OFFER_STATUS_LABELS: Record<QuotationOfferStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  withdrawn: "Withdrawn",
  rejected: "Rejected",
  superseded: "Superseded",
  awarded: "Awarded",
  not_selected: "Not selected",
};

export type QuotationFormValues = {
  currency: string;
  unit_price: string;
  price_unit: string;
  total_price: string;
  incoterm: string;
  lead_time_min: string;
  lead_time_max: string;
  lead_time_unit: string;
  moq_quantity: string;
  moq_unit: string;
  validity_until: string;
  notes: string;
};

export const EMPTY_QUOTATION_FORM: QuotationFormValues = {
  currency: "USD",
  unit_price: "",
  price_unit: "MT",
  total_price: "",
  incoterm: "FOB",
  lead_time_min: "",
  lead_time_max: "",
  lead_time_unit: "days",
  moq_quantity: "",
  moq_unit: "MT",
  validity_until: "",
  notes: "",
};

export type QuotationThreadSummary = QuotationThread & {
  rfq_title: string;
  rfq_product_name: string;
  current_offer: QuotationOffer | null;
  supplier_company_name?: string | null;
};

export type QuotationThreadDetail = {
  thread: QuotationThread;
  rfq: {
    id: string;
    title: string;
    product_name: string;
    status: string;
    visibility: string;
    buyer_company_id: string;
  };
  offers: QuotationOffer[];
  events: Array<{
    id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    message: string | null;
    created_at: string;
  }>;
};

export type AwardPayload = {
  awarded: boolean;
  is_winner: boolean;
  award: QuotationAward | null;
  events: AwardEvent[];
  own_thread_id?: string | null;
};

export type SupplierAwardSummary = QuotationAward & {
  rfq_title: string;
  rfq_product_name: string;
};

export function formValuesFromOffer(offer: QuotationOffer): QuotationFormValues {
  return {
    currency: offer.currency || "USD",
    unit_price: offer.unit_price != null ? String(offer.unit_price) : "",
    price_unit: offer.price_unit || "",
    total_price: offer.total_price != null ? String(offer.total_price) : "",
    incoterm: offer.incoterm || "",
    lead_time_min: offer.lead_time_min != null ? String(offer.lead_time_min) : "",
    lead_time_max: offer.lead_time_max != null ? String(offer.lead_time_max) : "",
    lead_time_unit: offer.lead_time_unit || "days",
    moq_quantity: offer.moq_quantity != null ? String(offer.moq_quantity) : "",
    moq_unit: offer.moq_unit || "",
    validity_until: offer.validity_until
      ? new Date(offer.validity_until).toISOString().slice(0, 16)
      : "",
    notes: offer.notes || "",
  };
}

export function formatMoney(offer: QuotationOffer): string {
  if (offer.unit_price == null) return "—";
  const unit = offer.price_unit ? ` / ${offer.price_unit}` : "";
  return `${offer.currency} ${offer.unit_price}${unit}`;
}

export function formatLeadTime(offer: QuotationOffer): string {
  if (offer.lead_time_min == null && offer.lead_time_max == null) return "—";
  if (offer.lead_time_min != null && offer.lead_time_max != null) {
    return `${offer.lead_time_min}–${offer.lead_time_max} ${offer.lead_time_unit}`;
  }
  const value = offer.lead_time_min ?? offer.lead_time_max;
  return `${value} ${offer.lead_time_unit}`;
}

export function formatMoq(offer: QuotationOffer): string {
  if (offer.moq_quantity == null) return "—";
  return `${offer.moq_quantity}${offer.moq_unit ? ` ${offer.moq_unit}` : ""}`;
}

export function currentOffer(offers: QuotationOffer[]): QuotationOffer | null {
  const awarded = offers
    .filter((o) => o.status === "awarded")
    .sort((a, b) => b.revision_no - a.revision_no);
  if (awarded[0]) return awarded[0];

  const submitted = offers
    .filter((o) => o.status === "submitted" || o.status === "not_selected")
    .sort((a, b) => b.revision_no - a.revision_no);
  if (submitted[0]) return submitted[0];

  const draft = offers.find((o) => o.status === "draft");
  return draft ?? offers[offers.length - 1] ?? null;
}
