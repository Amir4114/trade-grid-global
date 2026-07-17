import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AwardEvent,
  Database,
  QuotationAward,
  QuotationOffer,
  QuotationThread,
} from "@/lib/database/types";
import {
  currentOffer,
  type AwardPayload,
  type QuotationFormValues,
  type QuotationThreadDetail,
  type QuotationThreadSummary,
  type SupplierAwardSummary,
} from "@/lib/quotation/types";

type Client = SupabaseClient<Database>;

function toNumber(raw: string, label: string, required = false): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) throw new Error(`${label} is required.`);
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return value;
}

function toDeadline(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Validity date is invalid.");
  }
  return date.toISOString();
}

function commercialArgs(values: QuotationFormValues) {
  return {
    p_currency: values.currency.trim() || "USD",
    p_unit_price: toNumber(values.unit_price, "Unit price"),
    p_price_unit: values.price_unit.trim(),
    p_total_price: toNumber(values.total_price, "Total price"),
    p_incoterm: values.incoterm.trim(),
    p_lead_time_min: toNumber(values.lead_time_min, "Lead time min"),
    p_lead_time_max: toNumber(values.lead_time_max, "Lead time max"),
    p_lead_time_unit: values.lead_time_unit.trim() || "days",
    p_moq_quantity: toNumber(values.moq_quantity, "MOQ"),
    p_moq_unit: values.moq_unit.trim(),
    p_validity_until: toDeadline(values.validity_until),
    p_notes: values.notes.trim(),
  };
}

async function attachRfqTitles(
  supabase: Client,
  threads: QuotationThread[]
): Promise<QuotationThreadSummary[]> {
  if (threads.length === 0) return [];

  const rfqIds = [...new Set(threads.map((t) => t.rfq_id))];
  const offerIds = threads
    .map((t) => t.current_offer_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: rfqs }, { data: offers }] = await Promise.all([
    supabase.from("rfqs").select("id, title, product_name").in("id", rfqIds),
    offerIds.length
      ? supabase.from("quotation_offers").select("*").in("id", offerIds)
      : Promise.resolve({ data: [] as QuotationOffer[] }),
  ]);

  const rfqMap = new Map((rfqs ?? []).map((r) => [r.id, r]));
  const offerMap = new Map((offers ?? []).map((o) => [o.id, o as QuotationOffer]));

  return threads.map((thread) => {
    const rfq = rfqMap.get(thread.rfq_id);
    return {
      ...thread,
      rfq_title: rfq?.title ?? "RFQ",
      rfq_product_name: rfq?.product_name ?? "",
      current_offer: thread.current_offer_id
        ? offerMap.get(thread.current_offer_id) ?? null
        : null,
    };
  });
}

export async function listSupplierQuotationThreads(
  supabase: Client
): Promise<QuotationThreadSummary[]> {
  const { data, error } = await supabase
    .from("quotation_threads")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return attachRfqTitles(supabase, data ?? []);
}

export async function listBuyerQuotationThreadsForRfq(
  supabase: Client,
  rfqId: string
): Promise<QuotationThreadSummary[]> {
  const { data, error } = await supabase
    .from("quotation_threads")
    .select("*")
    .eq("rfq_id", rfqId)
    .neq("status", "draft")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const summaries = await attachRfqTitles(supabase, data ?? []);
  const companyIds = [...new Set(summaries.map((s) => s.supplier_company_id))];

  if (companyIds.length === 0) return summaries;

  const { data: companies } = await supabase
    .from("companies")
    .select("id, company_name")
    .in("id", companyIds);

  const names = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  return summaries.map((row) => ({
    ...row,
    supplier_company_name: names.get(row.supplier_company_id) ?? null,
  }));
}

export async function listBuyerAllQuotationThreads(
  supabase: Client
): Promise<QuotationThreadSummary[]> {
  const { data: rfqs, error: rfqError } = await supabase
    .from("rfqs")
    .select("id");

  if (rfqError) throw new Error(rfqError.message);
  const rfqIds = (rfqs ?? []).map((r) => r.id);
  if (rfqIds.length === 0) return [];

  const { data, error } = await supabase
    .from("quotation_threads")
    .select("*")
    .in("rfq_id", rfqIds)
    .in("status", ["active", "withdrawn", "awarded", "closed"])
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const summaries = await attachRfqTitles(supabase, data ?? []);
  const companyIds = [...new Set(summaries.map((s) => s.supplier_company_id))];
  const { data: companies } = await supabase
    .from("companies")
    .select("id, company_name")
    .in("id", companyIds);
  const names = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  return summaries.map((row) => ({
    ...row,
    supplier_company_name: names.get(row.supplier_company_id) ?? null,
  }));
}

export async function getOwnThreadForRfq(
  supabase: Client,
  rfqId: string
): Promise<QuotationThread | null> {
  const { data, error } = await supabase
    .from("quotation_threads")
    .select("*")
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getQuotationThreadDetail(
  supabase: Client,
  threadId: string
): Promise<QuotationThreadDetail> {
  const { data, error } = await supabase.rpc("get_quotation_thread", {
    p_thread_id: threadId,
  });

  if (error) throw new Error(error.message);

  const payload = data as {
    thread: QuotationThread;
    rfq: QuotationThreadDetail["rfq"];
    offers: QuotationOffer[];
    events: QuotationThreadDetail["events"];
  };

  return {
    thread: payload.thread,
    rfq: payload.rfq,
    offers: payload.offers ?? [],
    events: payload.events ?? [],
  };
}

export async function createDraftQuotation(
  supabase: Client,
  rfqId: string,
  values: QuotationFormValues
): Promise<QuotationOffer> {
  const args = commercialArgs(values);
  const { data, error } = await supabase.rpc("create_draft_quotation", {
    p_rfq_id: rfqId,
    ...args,
  });
  if (error) throw new Error(error.message);
  return data as QuotationOffer;
}

export async function updateDraftQuotation(
  supabase: Client,
  offerId: string,
  values: QuotationFormValues
): Promise<QuotationOffer> {
  const args = commercialArgs(values);
  const { data, error } = await supabase.rpc("update_draft_quotation", {
    p_offer_id: offerId,
    p_currency: args.p_currency,
    p_unit_price: args.p_unit_price,
    p_price_unit: args.p_price_unit,
    p_total_price: args.p_total_price,
    p_incoterm: args.p_incoterm,
    p_lead_time_min: args.p_lead_time_min,
    p_lead_time_max: args.p_lead_time_max,
    p_lead_time_unit: args.p_lead_time_unit,
    p_moq_quantity: args.p_moq_quantity,
    p_moq_unit: args.p_moq_unit,
    p_validity_until: args.p_validity_until,
    p_clear_validity: !args.p_validity_until,
    p_notes: args.p_notes,
  });
  if (error) throw new Error(error.message);
  return data as QuotationOffer;
}

export async function submitQuotation(
  supabase: Client,
  options: {
    rfqId?: string;
    offerId?: string;
    values: QuotationFormValues;
  }
): Promise<QuotationOffer> {
  const args = commercialArgs(options.values);
  if (args.p_unit_price == null) {
    throw new Error("Unit price is required to submit a quotation.");
  }

  const { data, error } = await supabase.rpc("submit_quotation", {
    p_rfq_id: options.rfqId ?? null,
    p_offer_id: options.offerId ?? null,
    ...args,
  });
  if (error) throw new Error(error.message);
  return data as QuotationOffer;
}

export async function reviseQuotation(
  supabase: Client,
  threadId: string,
  values: QuotationFormValues
): Promise<QuotationOffer> {
  const args = commercialArgs(values);
  if (args.p_unit_price == null) {
    throw new Error("Unit price is required for a revision.");
  }
  const { data, error } = await supabase.rpc("create_quotation_revision", {
    p_thread_id: threadId,
    ...args,
  });
  if (error) throw new Error(error.message);
  return data as QuotationOffer;
}

export async function withdrawQuotation(
  supabase: Client,
  threadId: string
): Promise<QuotationThread> {
  const { data, error } = await supabase.rpc("withdraw_quotation", {
    p_thread_id: threadId,
  });
  if (error) throw new Error(error.message);
  return data as QuotationThread;
}

export async function awardSupplier(
  supabase: Client,
  rfqId: string,
  threadId: string,
  notes?: string
): Promise<QuotationAward> {
  const { data, error } = await supabase.rpc("award_supplier", {
    p_rfq_id: rfqId,
    p_thread_id: threadId,
    p_notes: notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as QuotationAward;
}

export async function getAwardForRfq(
  supabase: Client,
  rfqId: string
): Promise<AwardPayload | null> {
  const { data, error } = await supabase.rpc("get_award", {
    p_rfq_id: rfqId,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const payload = data as {
    awarded?: boolean;
    is_winner?: boolean;
    award?: QuotationAward | null;
    events?: AwardEvent[];
    own_thread_id?: string | null;
  };

  return {
    awarded: Boolean(payload.awarded),
    is_winner: Boolean(payload.is_winner),
    award: payload.award ?? null,
    events: payload.events ?? [],
    own_thread_id: payload.own_thread_id ?? null,
  };
}

export async function revokeAward(
  supabase: Client,
  awardId: string,
  reason?: string
): Promise<QuotationAward> {
  const { data, error } = await supabase.rpc("revoke_award", {
    p_award_id: awardId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as QuotationAward;
}

export async function listSupplierAwards(
  supabase: Client
): Promise<SupplierAwardSummary[]> {
  const { data, error } = await supabase
    .from("quotation_awards")
    .select("*")
    .order("awarded_at", { ascending: false });

  if (error) throw new Error(error.message);
  const awards = (data ?? []) as QuotationAward[];
  if (awards.length === 0) return [];

  const rfqIds = [...new Set(awards.map((a) => a.rfq_id))];
  const { data: rfqs } = await supabase
    .from("rfqs")
    .select("id, title, product_name")
    .in("id", rfqIds);
  const rfqMap = new Map((rfqs ?? []).map((r) => [r.id, r]));

  return awards.map((award) => {
    const rfq = rfqMap.get(award.rfq_id);
    return {
      ...award,
      rfq_title: rfq?.title ?? "RFQ",
      rfq_product_name: rfq?.product_name ?? "",
    };
  });
}

export function pickCurrentOffer(offers: QuotationOffer[]): QuotationOffer | null {
  return currentOffer(offers);
}
