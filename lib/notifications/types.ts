export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationEntityType =
  | "company"
  | "product"
  | "account"
  | "rfq"
  | "quotation"
  | "purchase_order"
  | "fulfillment_order"
  | null;

/** Canonical notification type strings for Phase 1 and future AI/verification events. */
export type NotificationType =
  | "account.welcome"
  | "verification.submitted"
  | "verification.admin_review_required"
  | "verification.approved"
  | "verification.rejected"
  | "verification.reverification_required"
  | "verification.review_invalidated"
  | "product.submitted"
  | "product.admin_review_required"
  | "product.approved"
  | "product.rejected"
  | "rfq.published"
  | "rfq.invited"
  | "rfq.closed"
  | "rfq.cancelled"
  | "quotation.submitted"
  | "quotation.updated"
  | "quotation.withdrawn"
  | "quotation.awarded"
  | "quotation.not_selected"
  | "rfq.awarded"
  | "purchase_order.created"
  | "purchase_order.issued"
  | "purchase_order.accepted"
  | "purchase_order.rejected"
  | "purchase_order.cancelled"
  | "purchase_order.completed"
  | "fulfillment.opened"
  | "fulfillment.production_started"
  | "fulfillment.production_paused"
  | "fulfillment.qc_started"
  | "fulfillment.qc_passed"
  | "fulfillment.qc_failed"
  | "fulfillment.ready_to_ship"
  | "fulfillment.shipped"
  | "fulfillment.in_transit"
  | "fulfillment.delivered"
  | "fulfillment.completed"
  | "fulfillment.cancelled"
  | "fulfillment.failed"
  | "fulfillment.disputed"
  // Future AI / background verification (metadata-only conventions for now)
  | "verification.ai_started"
  | "verification.ai_completed"
  | "verification.ai_flagged"
  | "verification.sla_warning"
  | "verification.auto_approved";

export type AppNotification = {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationPage = {
  rows: AppNotification[];
  unreadCount: number;
};

/** Types that should optionally surface a lightweight arrival toast in the UI. */
export const ARRIVAL_TOAST_TYPES = new Set<string>([
  "verification.admin_review_required",
  "verification.reverification_required",
  "verification.review_invalidated",
  "product.admin_review_required",
  "verification.approved",
  "verification.rejected",
  "product.approved",
  "product.rejected",
  "rfq.published",
  "rfq.invited",
  "rfq.closed",
  "rfq.cancelled",
  "quotation.submitted",
  "quotation.updated",
  "quotation.withdrawn",
  "quotation.awarded",
  "quotation.not_selected",
  "rfq.awarded",
  "purchase_order.created",
  "purchase_order.issued",
  "purchase_order.accepted",
  "purchase_order.rejected",
  "purchase_order.cancelled",
  "fulfillment.opened",
  "fulfillment.production_started",
  "fulfillment.qc_failed",
  "fulfillment.shipped",
  "fulfillment.delivered",
  "fulfillment.completed",
  "fulfillment.cancelled",
  "fulfillment.failed",
  "fulfillment.disputed",
]);

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function mapNotificationRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    recipient_user_id: String(row.recipient_user_id),
    type: String(row.type),
    title: String(row.title),
    message: String(row.message),
    entity_type: row.entity_type ? String(row.entity_type) : null,
    entity_id: row.entity_id ? String(row.entity_id) : null,
    action_url: row.action_url ? String(row.action_url) : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    priority: (row.priority as NotificationPriority) ?? "normal",
    is_read: Boolean(row.is_read),
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at),
  };
}
