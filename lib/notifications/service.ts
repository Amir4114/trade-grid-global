import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/types";
import {
  mapNotificationRow,
  type AppNotification,
  type NotificationPage,
} from "@/lib/notifications/types";

type Client = SupabaseClient<Database>;

const DEFAULT_LIMIT = 20;

export async function fetchNotifications(
  supabase: Client,
  limit = DEFAULT_LIMIT
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapNotificationRow(row as Record<string, unknown>));
}

export async function fetchUnreadNotificationCount(
  supabase: Client
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function fetchNotificationPage(
  supabase: Client,
  limit = DEFAULT_LIMIT
): Promise<NotificationPage> {
  const [rows, unreadCount] = await Promise.all([
    fetchNotifications(supabase, limit),
    fetchUnreadNotificationCount(supabase),
  ]);

  return { rows, unreadCount };
}

export async function markNotificationRead(
  supabase: Client,
  notificationId: string
): Promise<AppNotification> {
  const { data, error } = await supabase.rpc("mark_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapNotificationRow(data as Record<string, unknown>);
}

export async function markAllNotificationsRead(
  supabase: Client
): Promise<number> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : 0;
}

type RealtimeHandlers = {
  onInsert?: (notification: AppNotification) => void;
  onUpdate?: (notification: AppNotification) => void;
};

export function subscribeToNotifications(
  supabase: Client,
  userId: string,
  handlers: RealtimeHandlers
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          handlers.onInsert?.(
            mapNotificationRow(payload.new as Record<string, unknown>)
          );
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          handlers.onUpdate?.(
            mapNotificationRow(payload.new as Record<string, unknown>)
          );
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
