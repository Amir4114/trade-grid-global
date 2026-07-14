"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/contexts/AuthProvider";
import { parseProfileRole } from "@/lib/dashboard/roles";
import {
  fetchNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service";
import { resolveSafeNotificationActionUrl } from "@/lib/notifications/safe-url";
import {
  formatRelativeTime,
  type AppNotification,
} from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const role = parseProfileRole(profile?.role);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      try {
        const page = await fetchNotificationPage(supabase, 50);
        if (cancelled) return;
        setItems(page.rows);
      } catch (err) {
        console.error(err);
        toast.error("Unable to load notifications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const unreadCount = items.filter((item) => !item.is_read).length;

  const handleOpen = async (notification: AppNotification) => {
    try {
      if (!notification.is_read) {
        const updated = await markNotificationRead(supabase, notification.id);
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
      }

      const destination = resolveSafeNotificationActionUrl(
        notification.action_url,
        role
      );

      if (destination) {
        router.push(destination);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to open notification.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setBusy(true);
      await markAllNotificationsRead(supabase);
      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
      toast.error("Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell
      title="Notifications"
      description="Verification updates, product reviews, and account alerts."
      actions={
        unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void handleMarkAllRead()}
          >
            Mark all read
          </Button>
        ) : null
      }
    >
      <DashboardPanel>
        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Loading notifications...
          </p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              No notifications yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              When you submit verification documents or products for review,
              updates will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-4 text-left transition hover:bg-neutral-50 sm:px-5",
                    !notification.is_read && "bg-amber-50/50"
                  )}
                  onClick={() => void handleOpen(notification)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-950">
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {notification.priority === "high" ||
                      notification.priority === "urgent" ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          {notification.priority}
                        </span>
                      ) : null}
                      <span className="text-xs text-neutral-400">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">{notification.message}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </DashboardShell>
  );
}
