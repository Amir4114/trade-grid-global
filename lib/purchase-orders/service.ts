import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  PurchaseOrder,
  PurchaseOrderDocument,
  PurchaseOrderEvent,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from "@/lib/database/types";
import type {
  PurchaseOrderDetail,
  PurchaseOrderDraftUpdate,
  PurchaseOrderListResult,
} from "@/lib/purchase-orders/types";
import {
  draftUpdateArgs,
  validateCancelReason,
  validateRejectReason,
} from "@/lib/purchase-orders/validators";

type Client = SupabaseClient<Database>;

function asPurchaseOrder(row: unknown): PurchaseOrder {
  return row as PurchaseOrder;
}

function asItems(rows: unknown): PurchaseOrderItem[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderItem[]) : [];
}

function asEvents(rows: unknown): PurchaseOrderEvent[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderEvent[]) : [];
}

function asDocuments(rows: unknown): PurchaseOrderDocument[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderDocument[]) : [];
}

export async function createPurchaseOrderDraft(
  supabase: Client,
  awardId: string,
  options?: { paymentTerms?: string; notes?: string }
): Promise<PurchaseOrder> {
  const { data, error } = await supabase.rpc("create_purchase_order_draft", {
    p_award_id: awardId,
    p_payment_terms: options?.paymentTerms ?? null,
    p_notes: options?.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function updatePurchaseOrderDraft(
  supabase: Client,
  purchaseOrderId: string,
  values: PurchaseOrderDraftUpdate
): Promise<PurchaseOrder> {
  const args = draftUpdateArgs(values);
  const { data, error } = await supabase.rpc("update_purchase_order_draft", {
    p_purchase_order_id: purchaseOrderId,
    ...args,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function issuePurchaseOrder(
  supabase: Client,
  purchaseOrderId: string
): Promise<PurchaseOrder> {
  const { data, error } = await supabase.rpc("issue_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function acceptPurchaseOrder(
  supabase: Client,
  purchaseOrderId: string
): Promise<PurchaseOrder> {
  const { data, error } = await supabase.rpc("accept_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function rejectPurchaseOrder(
  supabase: Client,
  purchaseOrderId: string,
  reason: string
): Promise<PurchaseOrder> {
  const validated = validateRejectReason(reason);
  const { data, error } = await supabase.rpc("reject_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
    p_reason: validated,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function cancelPurchaseOrder(
  supabase: Client,
  purchaseOrderId: string,
  reason?: string
): Promise<PurchaseOrder> {
  const validated = validateCancelReason(reason);
  const { data, error } = await supabase.rpc("cancel_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
    p_reason: validated,
  });
  if (error) throw new Error(error.message);
  return asPurchaseOrder(data);
}

export async function getPurchaseOrder(
  supabase: Client,
  purchaseOrderId: string
): Promise<PurchaseOrderDetail | null> {
  const { data, error } = await supabase.rpc("get_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  if (!payload.purchase_order) return null;

  return {
    purchase_order: asPurchaseOrder(payload.purchase_order),
    items: asItems(payload.items),
    events: asEvents(payload.events),
    documents: asDocuments(payload.documents),
  };
}

export async function listPurchaseOrders(
  supabase: Client,
  options?: {
    status?: PurchaseOrderStatus | null;
    limit?: number;
    offset?: number;
  }
): Promise<PurchaseOrderListResult> {
  const { data, error } = await supabase.rpc("list_purchase_orders", {
    p_status: options?.status ?? null,
    p_limit: options?.limit ?? 50,
    p_offset: options?.offset ?? 0,
  });
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row) => asPurchaseOrder(row))
    : [];

  return {
    rows,
    limit: typeof payload.limit === "number" ? payload.limit : 50,
    offset: typeof payload.offset === "number" ? payload.offset : 0,
  };
}

export async function findActivePurchaseOrderForAward(
  supabase: Client,
  awardId: string
): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("award_id", awardId)
    .in("status", ["draft", "issued", "accepted"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asPurchaseOrder(data) : null;
}
