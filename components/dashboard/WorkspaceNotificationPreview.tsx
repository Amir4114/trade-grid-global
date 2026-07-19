"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { fetchNotifications } from "@/lib/notifications/service"
import type { AppNotification } from "@/lib/notifications/types"
import { createClient } from "@/lib/supabase/client"

export function WorkspaceNotificationPreview() {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<AppNotification[] | null>(
    null
  )
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void fetchNotifications(supabase, 4)
      .then((rows) => {
        if (active) setNotifications(rows)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [supabase])

  return (
    <DashboardPanel
      title="Notifications"
      description="Recent account and trade updates."
    >
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Notifications are temporarily unavailable.
        </p>
      ) : notifications === null ? (
        <div className="space-y-3" aria-label="Loading notifications">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-lg bg-neutral-100"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center">
          <Bell className="mx-auto size-6 text-neutral-400" />
          <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-neutral-500">
            New verification and trade updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {notifications.map((notification) => (
            <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    notification.is_read ? "bg-neutral-300" : "bg-amber-500"
                  }`}
                  aria-label={notification.is_read ? "Read" : "Unread"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                    {notification.message}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/dashboard/notifications">View all notifications</Link>
      </Button>
    </DashboardPanel>
  )
}
