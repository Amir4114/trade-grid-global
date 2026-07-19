"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PackageCheck } from "lucide-react"

import DashboardPanel from "@/components/dashboard/DashboardPanel"
import DashboardShell from "@/components/dashboard/DashboardShell"
import { FulfillmentStatusBadge } from "@/components/fulfillment/FulfillmentStatusBadge"
import { OrdersSegmentNav } from "@/components/fulfillment/OrdersSegmentNav"
import { Button } from "@/components/ui/button"
import type {
  FulfillmentOrder,
  FulfillmentOrderStatus,
} from "@/lib/database/types"
import { listFulfillments } from "@/lib/fulfillment/service"
import {
  fulfillmentStatuses,
  formatFulfillmentStatus,
} from "@/lib/fulfillment/ui"
import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 25

export function FulfillmentList({ role }: { role: "buyer" | "supplier" }) {
  const supabase = useMemo(() => createClient(), [])
  const [filter, setFilter] = useState<FulfillmentOrderStatus | "all">("all")
  const [rows, setRows] = useState<FulfillmentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)

  useEffect(() => {
    let active = true
    void listFulfillments(supabase, {
      status: filter === "all" ? null : filter,
      limit: PAGE_SIZE + 1,
      offset: page * PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return
        setRows(result.rows.slice(0, PAGE_SIZE))
        setHasNextPage(result.rows.length > PAGE_SIZE)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error ? err.message : "Failed to load fulfillments."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filter, page, reloadKey, supabase])

  function selectFilter(next: FulfillmentOrderStatus | "all") {
    setLoading(true)
    setPage(0)
    if (next === filter && page === 0) {
      setReloadKey((value) => value + 1)
      return
    }
    setFilter(next)
  }

  const detailBase = `/dashboard/${role}/orders?tab=fulfillment&id=`

  return (
    <DashboardShell
      role={role}
      title="Order Fulfillment"
      description={
        role === "buyer"
          ? "Track operational execution after suppliers accept your purchase orders."
          : "Manage production, quality, dispatch, and delivery for accepted purchase orders."
      }
    >
      <OrdersSegmentNav role={role} active="fulfillment" />
      <DashboardPanel
        title="Fulfillments"
        description="One operational record is created automatically for every accepted purchase order."
      >
        <div
          className="mb-5 flex flex-wrap gap-2"
          aria-label="Fulfillment status filters"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => selectFilter("all")}
            className={
              filter === "all"
                ? "rounded-md bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            }
          >
            All
          </button>
          {fulfillmentStatuses.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              onClick={() => selectFilter(status)}
              className={
                filter === status
                  ? "rounded-md bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              }
            >
              {formatFulfillmentStatus(status)}
            </button>
          ))}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
          >
            <p className="text-sm text-red-700">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setLoading(true)
                setReloadKey((value) => value + 1)
              }}
            >
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-3" aria-label="Loading fulfillments">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl bg-neutral-100"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <PackageCheck className="mx-auto size-9 text-neutral-400" />
            <h2 className="mt-4 text-base font-semibold">
              No fulfillments found
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              Fulfillment is created automatically when a supplier accepts an
              issued purchase order.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-950">
                        {row.fulfillment_number}
                      </span>
                      <FulfillmentStatusBadge status={row.status} />
                      {row.is_paused ? (
                        <span className="text-xs font-medium text-amber-700">
                          Paused
                        </span>
                      ) : null}
                      {row.is_disputed ? (
                        <span className="text-xs font-medium text-red-700">
                          Disputed
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      Purchase order {row.purchase_order_id.slice(0, 8)}…
                      {row.tracking_reference
                        ? ` · Tracking ${row.tracking_reference}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Updated {new Date(row.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${detailBase}${row.id}`}>
                      Track fulfillment
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page === 0}
                onClick={() => {
                  setLoading(true)
                  setPage((value) => Math.max(0, value - 1))
                }}
              >
                Previous
              </Button>
              <span className="text-xs text-neutral-500">Page {page + 1}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !hasNextPage}
                onClick={() => {
                  setLoading(true)
                  setPage((value) => value + 1)
                }}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </DashboardPanel>
    </DashboardShell>
  )
}
