"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileText, MapPin, PackageCheck, Route } from "lucide-react"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import DashboardShell from "@/components/dashboard/DashboardShell"
import { FulfillmentActions } from "@/components/fulfillment/FulfillmentActions"
import { FulfillmentProgress } from "@/components/fulfillment/FulfillmentProgress"
import { FulfillmentStatusBadge } from "@/components/fulfillment/FulfillmentStatusBadge"
import { FulfillmentTimeline } from "@/components/fulfillment/FulfillmentTimeline"
import { OrdersSegmentNav } from "@/components/fulfillment/OrdersSegmentNav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  addFulfillmentComment,
  getFulfillment,
  type FulfillmentDetail,
  type FulfillmentMilestoneType,
} from "@/lib/fulfillment/service"
import {
  fulfillmentEventLabel,
  fulfillmentEventTime,
  isMilestoneEvent,
} from "@/lib/fulfillment/ui"
import { createClient } from "@/lib/supabase/client"

export function FulfillmentDetailView({
  role,
  fulfillmentId,
}: {
  role: "buyer" | "supplier"
  fulfillmentId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [detail, setDetail] = useState<FulfillmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [comment, setComment] = useState("")

  const reload = useCallback(async () => {
    const next = await getFulfillment(supabase, fulfillmentId)
    setDetail(next)
    return next
  }, [fulfillmentId, supabase])

  useEffect(() => {
    let active = true
    void getFulfillment(supabase, fulfillmentId)
      .then((next) => {
        if (!active) return
        setDetail(next)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error ? err.message : "Failed to load fulfillment."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fulfillmentId, supabase])

  async function run(
    action: () => Promise<unknown>,
    success: string
  ): Promise<void> {
    try {
      setBusy(true)
      setError(null)
      setMessage(null)
      await action()
      await reload()
      setMessage(success)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell
        role={role}
        title="Fulfillment"
        description="Loading operational timeline..."
      >
        <div className="space-y-4" aria-label="Loading fulfillment">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-white"
            />
          ))}
        </div>
      </DashboardShell>
    )
  }

  if (!detail) {
    return (
      <DashboardShell
        role={role}
        title="Fulfillment"
        description="Operational record unavailable"
      >
        <DashboardPanel>
          <div className="py-10 text-center">
            <p className="text-sm text-red-700">
              {error ?? "Fulfillment not found or access denied."}
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href={`/dashboard/${role}/orders?tab=fulfillment`}>
                Back to fulfillments
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      </DashboardShell>
    )
  }

  const fulfillment = detail.fulfillment_order
  const milestones = detail.events
    .filter(isMilestoneEvent)
    .sort(
      (left, right) =>
        new Date(fulfillmentEventTime(left)).getTime() -
        new Date(fulfillmentEventTime(right)).getTime()
    )
  const recordedMilestones = detail.events.flatMap((event) => {
    if (event.event_type !== "fulfillment.milestone_completed") return []
    const value = event.metadata.milestone_type
    return typeof value === "string" ? [value as FulfillmentMilestoneType] : []
  })

  return (
    <DashboardShell
      role={role}
      title={fulfillment.fulfillment_number}
      description="Operational execution linked to an immutable accepted purchase order."
      actions={
        <Button asChild variant="outline">
          <Link href={`/dashboard/${role}/orders?tab=fulfillment`}>
            All fulfillments
          </Link>
        </Button>
      }
    >
      <OrdersSegmentNav role={role} active="fulfillment" />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <PackageCheck className="size-5 text-amber-700" />
          <p className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Status
          </p>
          <div className="mt-2">
            <FulfillmentStatusBadge status={fulfillment.status} />
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <FileText className="size-5 text-amber-700" />
          <p className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Purchase Order
          </p>
          <Link
            href={`/dashboard/${role}/orders/${fulfillment.purchase_order_id}`}
            className="mt-2 block truncate text-sm font-semibold hover:underline"
          >
            {fulfillment.purchase_order_id}
          </Link>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <Route className="size-5 text-amber-700" />
          <p className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Tracking
          </p>
          <p className="mt-2 truncate text-sm font-semibold">
            {fulfillment.tracking_reference || "Not assigned"}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <MapPin className="size-5 text-amber-700" />
          <p className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Production Location
          </p>
          <p className="mt-2 truncate text-sm font-semibold">
            {fulfillment.production_location || "Not assigned"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <FulfillmentProgress status={fulfillment.status} />
      </div>

      {fulfillment.is_disputed ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Delivery disputed</h2>
          <p className="mt-1 text-sm text-red-800">
            {fulfillment.dispute_reason || "Completion is on hold."}
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <DashboardPanel
            title="Timeline"
            description="Chronological, append-only operational history."
          >
            <FulfillmentTimeline events={detail.events} />
          </DashboardPanel>

          <DashboardPanel
            title="Milestones"
            description="State-derived and supplemental operational checkpoints."
          >
            {milestones.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {milestones.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <p className="text-sm font-semibold">
                      {fulfillmentEventLabel(event)}
                    </p>
                    <time
                      className="mt-1 block text-xs text-neutral-500"
                      dateTime={fulfillmentEventTime(event)}
                    >
                      {new Date(fulfillmentEventTime(event)).toLocaleString()}
                    </time>
                    {event.message ? (
                      <p className="mt-2 text-sm text-neutral-600">
                        {event.message}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                No milestones recorded yet.
              </p>
            )}
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel
            title={
              role === "supplier" ? "Manage Progress" : "Fulfillment Actions"
            }
            description="All changes are validated by trusted lifecycle RPCs."
          >
            <FulfillmentActions
              role={role}
              fulfillment={fulfillment}
              recordedMilestones={recordedMilestones}
              busy={busy}
              run={run}
            />
          </DashboardPanel>

          <DashboardPanel
            title="Add Comment"
            description="Comments become immutable timeline events."
          >
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add an operational note for the counterparty"
              maxLength={2000}
            />
            <Button
              className="mt-3 w-full"
              disabled={busy || !comment.trim()}
              onClick={() =>
                run(
                  () =>
                    addFulfillmentComment(
                      supabase,
                      fulfillment.id,
                      comment
                    ).then(() => setComment("")),
                  "Comment added."
                )
              }
            >
              Add comment
            </Button>
          </DashboardPanel>

          <DashboardPanel title="Documents">
            <p className="text-sm text-neutral-600">
              {detail.documents.length} operational{" "}
              {detail.documents.length === 1 ? "document" : "documents"} linked.
            </p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Attachment upload remains reserved for the governed document
              workflow; public URLs are never used.
            </p>
          </DashboardPanel>
        </div>
      </div>
    </DashboardShell>
  )
}
