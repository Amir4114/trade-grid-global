"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/contexts/AuthProvider";
import { parseProfileRole } from "@/lib/dashboard/roles";
import {
  fetchNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/lib/notifications/service";
import { resolveSafeNotificationActionUrl } from "@/lib/notifications/safe-url";
import {
  ARRIVAL_TOAST_TYPES,
  formatRelativeTime,
  type AppNotification,
} from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function formatBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const role = parseProfileRole(profile?.role);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const realtimeReadyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      const page = await fetchNotificationPage(supabase, 15);
      setItems(page.rows);
      setUnreadCount(page.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      try {
        const page = await fetchNotificationPage(supabase, 15);
        if (cancelled) return;
        setItems(page.rows);
        setUnreadCount(page.unreadCount);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(supabase, user.id, {
      onInsert: (notification) => {
        setItems((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ].slice(0, 15));
        setUnreadCount((count) => count + 1);

        if (
          realtimeReadyRef.current &&
          ARRIVAL_TOAST_TYPES.has(notification.type)
        ) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }
      },
      onUpdate: (notification) => {
        setItems((current) => {
          const next = current.map((item) =>
            item.id === notification.id ? notification : item
          );
          setUnreadCount(next.filter((item) => !item.is_read).length);
          return next;
        });
      },
    });

    const timer = setTimeout(() => {
      realtimeReadyRef.current = true;
    }, 1500);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleOpen = async () => {
    setOpen((value) => !value);
    if (!open) {
      await refresh();
    }
  };

  const handleSelect = async (notification: AppNotification) => {
    try {
      if (!notification.is_read) {
        const updated = await markNotificationRead(supabase, notification.id);
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      const destination = resolveSafeNotificationActionUrl(
        notification.action_url,
        role
      );

      setOpen(false);

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
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
      toast.error("Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => void handleOpen()}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-neutral-950">
            {formatBadgeCount(unreadCount)}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-neutral-950">
                Notifications
              </p>
              {unreadCount > 0 ? (
                <p className="text-xs text-neutral-500">
                  {unreadCount} unread
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={busy}
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all read
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                <Link href="/dashboard/notifications">View all</Link>
              </Button>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">
                Loading notifications...
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-neutral-900">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Important updates about verification and products will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-neutral-50",
                        !notification.is_read && "bg-amber-50/60"
                      )}
                      onClick={() => void handleSelect(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-950">
                          {notification.title}
                        </p>
                        {!notification.is_read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />
                        ) : null}
                      </div>
                      <p className="text-xs leading-5 text-neutral-600">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
