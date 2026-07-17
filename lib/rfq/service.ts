import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Rfq,
  RfqInvite,
  RfqStatus,
  RfqVisibility,
} from "@/lib/database/types";
import {
  parseCsvList,
  type BuyerRfqListItem,
  type RfqDetail,
  type RfqFormValues,
  type SupplierRfqListItem,
} from "@/lib/rfq/types";

type Client = SupabaseClient<Database>;

function toQuantityValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error("Quantity must be a valid number.");
  }
  return value;
}

function toDeadline(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Quote deadline is invalid.");
  }
  return date.toISOString();
}

export async function listBuyerRfqs(supabase: Client): Promise<BuyerRfqListItem[]> {
  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { data: invites, error: inviteError } = await supabase
    .from("rfq_invites")
    .select("rfq_id")
    .in("rfq_id", ids);

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const counts = new Map<string, number>();
  for (const invite of invites ?? []) {
    counts.set(invite.rfq_id, (counts.get(invite.rfq_id) ?? 0) + 1);
  }

  return rows.map((rfq) => ({
    ...rfq,
    invite_count: counts.get(rfq.id) ?? 0,
  }));
}

export async function listDiscoverableRfqs(
  supabase: Client,
  filters: { q?: string; category?: string; status?: "open" | "quoted" | "all" } = {}
): Promise<SupplierRfqListItem[]> {
  let query = supabase
    .from("rfqs")
    .select("*")
    .in("status", ["open", "quoted"])
    .order("published_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let rows = data ?? [];
  if (filters.q?.trim()) {
    const term = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (rfq) =>
        rfq.title.toLowerCase().includes(term) ||
        rfq.product_name.toLowerCase().includes(term) ||
        rfq.category.toLowerCase().includes(term) ||
        rfq.target_country.toLowerCase().includes(term)
    );
  }

  const companyIds = [...new Set(rows.map((row) => row.buyer_company_id))];
  const companyNames = new Map<string, string>();

  if (companyIds.length > 0) {
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, company_name")
      .in("id", companyIds);

    // Buyer company names may be blocked by RLS for suppliers; tolerate empty.
    if (!companyError && companies) {
      for (const company of companies) {
        companyNames.set(company.id, company.company_name);
      }
    }
  }

  return rows.map((rfq) => ({
    ...rfq,
    buyer_company_name: companyNames.get(rfq.buyer_company_id) ?? null,
  }));
}

export async function getRfqDetail(
  supabase: Client,
  rfqId: string
): Promise<RfqDetail | null> {
  const { data: rfq, error } = await supabase
    .from("rfqs")
    .select("*")
    .eq("id", rfqId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!rfq) return null;

  const [{ data: invites, error: inviteError }, { data: events, error: eventError }] =
    await Promise.all([
      supabase
        .from("rfq_invites")
        .select("*")
        .eq("rfq_id", rfqId)
        .order("invited_at", { ascending: true }),
      supabase
        .from("rfq_events")
        .select(
          "id, event_type, actor_type, from_status, to_status, message, created_at"
        )
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false }),
    ]);

  if (inviteError) throw new Error(inviteError.message);
  if (eventError) throw new Error(eventError.message);

  return {
    rfq,
    invites: (invites ?? []) as RfqInvite[],
    events: events ?? [],
  };
}

export async function createDraftRfq(
  supabase: Client,
  values: RfqFormValues
): Promise<Rfq> {
  const { data, error } = await supabase.rpc("create_draft_rfq", {
    p_title: values.title.trim(),
    p_product_name: values.product_name.trim(),
    p_category: values.category.trim(),
    p_description: values.description.trim(),
    p_quantity_value: toQuantityValue(values.quantity_value),
    p_quantity_unit: values.quantity_unit.trim(),
    p_packaging_requirement: values.packaging_requirement.trim(),
    p_target_country: values.target_country.trim(),
    p_delivery_port: values.delivery_port.trim(),
    p_required_certifications: parseCsvList(values.required_certifications),
    p_preferred_incoterms: parseCsvList(values.preferred_incoterms),
    p_quote_deadline_at: toDeadline(values.quote_deadline_at),
    p_notes: values.notes.trim(),
    p_visibility: values.visibility,
    p_invite_supplier_ids: values.invite_supplier_ids,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rfq;
}

export async function updateDraftRfq(
  supabase: Client,
  rfqId: string,
  values: RfqFormValues
): Promise<Rfq> {
  const deadline = toDeadline(values.quote_deadline_at);

  const { data, error } = await supabase.rpc("update_draft_rfq", {
    p_rfq_id: rfqId,
    p_title: values.title.trim(),
    p_product_name: values.product_name.trim(),
    p_category: values.category.trim(),
    p_description: values.description.trim(),
    p_quantity_value: toQuantityValue(values.quantity_value),
    p_quantity_unit: values.quantity_unit.trim(),
    p_packaging_requirement: values.packaging_requirement.trim(),
    p_target_country: values.target_country.trim(),
    p_delivery_port: values.delivery_port.trim(),
    p_required_certifications: parseCsvList(values.required_certifications),
    p_preferred_incoterms: parseCsvList(values.preferred_incoterms),
    p_quote_deadline_at: deadline,
    p_clear_quote_deadline: !deadline,
    p_notes: values.notes.trim(),
    p_visibility: values.visibility,
    p_invite_supplier_ids: values.invite_supplier_ids,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rfq;
}

export async function publishRfq(supabase: Client, rfqId: string): Promise<Rfq> {
  const { data, error } = await supabase.rpc("publish_rfq", {
    p_rfq_id: rfqId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rfq;
}

export async function closeRfq(supabase: Client, rfqId: string): Promise<Rfq> {
  const { data, error } = await supabase.rpc("close_rfq", {
    p_rfq_id: rfqId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rfq;
}

export async function cancelRfq(
  supabase: Client,
  rfqId: string,
  reason?: string
): Promise<Rfq> {
  const { data, error } = await supabase.rpc("cancel_rfq", {
    p_rfq_id: rfqId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rfq;
}

export function formValuesFromRfq(rfq: Rfq, invites: RfqInvite[] = []): RfqFormValues {
  return {
    title: rfq.title,
    product_name: rfq.product_name,
    category: rfq.category,
    description: rfq.description,
    quantity_value: rfq.quantity_value != null ? String(rfq.quantity_value) : "",
    quantity_unit: rfq.quantity_unit,
    packaging_requirement: rfq.packaging_requirement,
    target_country: rfq.target_country,
    delivery_port: rfq.delivery_port,
    required_certifications: (rfq.required_certifications ?? []).join(", "),
    preferred_incoterms: (rfq.preferred_incoterms ?? []).join(", "),
    quote_deadline_at: rfq.quote_deadline_at
      ? new Date(rfq.quote_deadline_at).toISOString().slice(0, 16)
      : "",
    notes: rfq.notes,
    visibility: rfq.visibility,
    invite_supplier_ids: invites.map((invite) => invite.supplier_company_id),
  };
}

export function statusTone(status: RfqStatus): string {
  switch (status) {
    case "open":
    case "quoted":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "draft":
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
    case "closed":
      return "border-neutral-300 bg-neutral-100 text-neutral-600";
    case "cancelled":
    case "expired":
      return "border-red-200 bg-red-50 text-red-700";
    case "awarded":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export function visibilityTone(visibility: RfqVisibility): string {
  switch (visibility) {
    case "public":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "invite_only":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}
