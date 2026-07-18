import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  FulfillmentOrder,
  FulfillmentOrderDocument,
  FulfillmentOrderEvent,
  FulfillmentOrderStatus,
} from "@/lib/database/types";

type Client = SupabaseClient<Database>;

export type FulfillmentDetail = {
  fulfillment_order: FulfillmentOrder;
  events: FulfillmentOrderEvent[];
  documents: FulfillmentOrderDocument[];
};

export type FulfillmentListResult = {
  rows: FulfillmentOrder[];
  limit: number;
  offset: number;
};

function asFulfillment(row: unknown): FulfillmentOrder {
  return row as FulfillmentOrder;
}

export async function createFulfillment(
  supabase: Client,
  purchaseOrderId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("create_fulfillment", {
    p_purchase_order_id: purchaseOrderId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function startProduction(
  supabase: Client,
  fulfillmentId: string,
  productionLocation?: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("start_production", {
    p_fulfillment_id: fulfillmentId,
    p_production_location: productionLocation ?? null,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function pauseProduction(
  supabase: Client,
  fulfillmentId: string,
  reason?: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("pause_production", {
    p_fulfillment_id: fulfillmentId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function resumeProduction(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("resume_production", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function completeProduction(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("complete_production", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function passQc(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("pass_qc", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function failQc(
  supabase: Client,
  fulfillmentId: string,
  reason: string,
  terminal = false
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("fail_qc", {
    p_fulfillment_id: fulfillmentId,
    p_reason: reason,
    p_terminal: terminal,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function packOrder(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("pack_order", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function markShipped(
  supabase: Client,
  fulfillmentId: string,
  trackingReference?: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("mark_shipped", {
    p_fulfillment_id: fulfillmentId,
    p_tracking_reference: trackingReference ?? null,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function markInTransit(
  supabase: Client,
  fulfillmentId: string,
  trackingReference?: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("mark_in_transit", {
    p_fulfillment_id: fulfillmentId,
    p_tracking_reference: trackingReference ?? null,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function markDelivered(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("mark_delivered", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function completeFulfillment(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("complete_fulfillment", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function cancelFulfillment(
  supabase: Client,
  fulfillmentId: string,
  reason?: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("cancel_fulfillment", {
    p_fulfillment_id: fulfillmentId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function failProduction(
  supabase: Client,
  fulfillmentId: string,
  reason: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("fail_production", {
    p_fulfillment_id: fulfillmentId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function raiseFulfillmentDispute(
  supabase: Client,
  fulfillmentId: string,
  reason: string
): Promise<FulfillmentOrder> {
  const { data, error } = await supabase.rpc("raise_fulfillment_dispute", {
    p_fulfillment_id: fulfillmentId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return asFulfillment(data);
}

export async function getFulfillment(
  supabase: Client,
  fulfillmentId: string
): Promise<FulfillmentDetail | null> {
  const { data, error } = await supabase.rpc("get_fulfillment", {
    p_fulfillment_id: fulfillmentId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  if (!payload.fulfillment_order) return null;
  return {
    fulfillment_order: asFulfillment(payload.fulfillment_order),
    events: Array.isArray(payload.events)
      ? (payload.events as FulfillmentOrderEvent[])
      : [],
    documents: Array.isArray(payload.documents)
      ? (payload.documents as FulfillmentOrderDocument[])
      : [],
  };
}

export async function listFulfillments(
  supabase: Client,
  options?: {
    status?: FulfillmentOrderStatus | null;
    limit?: number;
    offset?: number;
  }
): Promise<FulfillmentListResult> {
  const { data, error } = await supabase.rpc("list_fulfillments", {
    p_status: options?.status ?? null,
    p_limit: options?.limit ?? 50,
    p_offset: options?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row) => asFulfillment(row))
    : [];
  return {
    rows,
    limit: typeof payload.limit === "number" ? payload.limit : 50,
    offset: typeof payload.offset === "number" ? payload.offset : 0,
  };
}
