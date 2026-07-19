"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { FulfillmentOrder } from "@/lib/database/types"
import {
  addFulfillmentMilestone,
  cancelFulfillment,
  completeFulfillment,
  completeProduction,
  failProduction,
  failQc,
  markDelivered,
  markInTransit,
  markReady,
  markShipped,
  passQc,
  pauseProduction,
  raiseFulfillmentDispute,
  resumeProduction,
  startProduction,
  type FulfillmentMilestoneType,
} from "@/lib/fulfillment/service"
import { availableSupplementalMilestones } from "@/lib/fulfillment/ui"
import { createClient } from "@/lib/supabase/client"

type Props = {
  role: "buyer" | "supplier"
  fulfillment: FulfillmentOrder
  recordedMilestones: FulfillmentMilestoneType[]
  busy: boolean
  run: (action: () => Promise<unknown>, success: string) => Promise<void>
}

const terminalStatuses = new Set(["completed", "cancelled", "failed"])

export function FulfillmentActions({
  role,
  fulfillment,
  recordedMilestones,
  busy,
  run,
}: Props) {
  const supabase = createClient()
  const [productionLocation, setProductionLocation] = useState("")
  const [trackingReference, setTrackingReference] = useState("")
  const [reason, setReason] = useState("")
  const [milestone, setMilestone] =
    useState<FulfillmentMilestoneType>("shipment_booked")
  const [milestoneNotes, setMilestoneNotes] = useState("")

  const status = fulfillment.status
  const availableMilestones = availableSupplementalMilestones(
    status,
    recordedMilestones
  )
  const selectedMilestone =
    availableMilestones.find((option) => option.value === milestone)?.value ??
    availableMilestones[0]?.value
  const canBuyerCancel = [
    "opened",
    "in_production",
    "quality_check",
    "packaging",
    "ready_to_ship",
  ].includes(status)

  if (terminalStatuses.has(status)) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        This fulfillment is closed. Its timeline remains available for audit.
      </p>
    )
  }

  return (
    <div className="space-y-5" aria-busy={busy}>
      {role === "supplier" ? (
        <>
          <div>
            <h3 className="text-sm font-semibold">Lifecycle actions</h3>
            <div className="mt-3 space-y-3">
              {status === "opened" ? (
                <>
                  <Input
                    value={productionLocation}
                    onChange={(event) =>
                      setProductionLocation(event.target.value)
                    }
                    placeholder="Production location (optional)"
                    aria-label="Production location"
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          startProduction(
                            supabase,
                            fulfillment.id,
                            productionLocation
                          ),
                        "Production started."
                      )
                    }
                  >
                    Start production
                  </Button>
                </>
              ) : null}

              {status === "in_production" ? (
                <div className="flex flex-wrap gap-2">
                  {fulfillment.is_paused ? (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => resumeProduction(supabase, fulfillment.id),
                          "Production resumed."
                        )
                      }
                    >
                      Resume production
                    </Button>
                  ) : (
                    <>
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() =>
                          run(
                            () =>
                              pauseProduction(supabase, fulfillment.id, reason),
                            "Production paused."
                          )
                        }
                      >
                        Pause production
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => completeProduction(supabase, fulfillment.id),
                            "Production completed and quality check started."
                          )
                        }
                      >
                        Complete production
                      </Button>
                      <Button
                        disabled={busy || !reason.trim()}
                        variant="destructive"
                        onClick={() =>
                          run(
                            () =>
                              failProduction(supabase, fulfillment.id, reason),
                            "Production marked failed."
                          )
                        }
                      >
                        Mark failed
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

              {status === "quality_check" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => passQc(supabase, fulfillment.id),
                        "Quality check passed."
                      )
                    }
                  >
                    Pass quality check
                  </Button>
                  <Button
                    disabled={busy || !reason.trim()}
                    variant="outline"
                    onClick={() =>
                      run(
                        () => failQc(supabase, fulfillment.id, reason, false),
                        "Returned to production for rework."
                      )
                    }
                  >
                    Return for rework
                  </Button>
                  <Button
                    disabled={busy || !reason.trim()}
                    variant="destructive"
                    onClick={() =>
                      run(
                        () => failQc(supabase, fulfillment.id, reason, true),
                        "Quality check marked terminally failed."
                      )
                    }
                  >
                    Terminal QC failure
                  </Button>
                </div>
              ) : null}

              {status === "packaging" ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => markReady(supabase, fulfillment.id),
                      "Packing completed; ready for dispatch."
                    )
                  }
                >
                  Complete packing
                </Button>
              ) : null}

              {status === "ready_to_ship" ? (
                <>
                  <Input
                    value={trackingReference}
                    onChange={(event) =>
                      setTrackingReference(event.target.value)
                    }
                    placeholder="Tracking or booking reference"
                    aria-label="Tracking reference"
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          markShipped(
                            supabase,
                            fulfillment.id,
                            trackingReference
                          ),
                        "Shipment marked dispatched."
                      )
                    }
                  >
                    Mark shipped
                  </Button>
                </>
              ) : null}

              {status === "shipped" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          markInTransit(
                            supabase,
                            fulfillment.id,
                            trackingReference
                          ),
                        "Shipment marked in transit."
                      )
                    }
                  >
                    Mark in transit
                  </Button>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      run(
                        () => markDelivered(supabase, fulfillment.id),
                        "Delivery recorded."
                      )
                    }
                  >
                    Mark delivered
                  </Button>
                </div>
              ) : null}

              {status === "in_transit" ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => markDelivered(supabase, fulfillment.id),
                      "Delivery recorded."
                    )
                  }
                >
                  Mark delivered
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-5">
            <h3 className="text-sm font-semibold">Record milestone</h3>
            {selectedMilestone ? (
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-neutral-600">
                  Milestone
                  <select
                    value={selectedMilestone}
                    onChange={(event) =>
                      setMilestone(
                        event.target.value as FulfillmentMilestoneType
                      )
                    }
                    className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                  >
                    {availableMilestones.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Textarea
                  value={milestoneNotes}
                  onChange={(event) => setMilestoneNotes(event.target.value)}
                  placeholder="Milestone notes (optional)"
                  maxLength={2000}
                />
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    run(
                      () =>
                        addFulfillmentMilestone(
                          supabase,
                          fulfillment.id,
                          selectedMilestone,
                          { notes: milestoneNotes }
                        ),
                      "Milestone recorded."
                    )
                  }
                >
                  Add milestone
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                No additional milestone is available at this stage.
              </p>
            )}
          </div>
        </>
      ) : (
        <div>
          <h3 className="text-sm font-semibold">Buyer actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "shipped" || status === "in_transit" ? (
              <Button
                disabled={busy}
                onClick={() =>
                  run(
                    () => markDelivered(supabase, fulfillment.id),
                    "Delivery recorded."
                  )
                }
              >
                Confirm delivery
              </Button>
            ) : null}
            {status === "delivered" ? (
              <>
                <Button
                  disabled={busy || fulfillment.is_disputed}
                  onClick={() =>
                    run(
                      () => completeFulfillment(supabase, fulfillment.id),
                      "Fulfillment completed."
                    )
                  }
                >
                  Complete fulfillment
                </Button>
                <Button
                  disabled={busy || !reason.trim() || fulfillment.is_disputed}
                  variant="destructive"
                  onClick={() =>
                    run(
                      () =>
                        raiseFulfillmentDispute(
                          supabase,
                          fulfillment.id,
                          reason
                        ),
                      "Delivery dispute recorded."
                    )
                  }
                >
                  Raise dispute
                </Button>
              </>
            ) : null}
            {(status === "shipped" || status === "in_transit") &&
            !fulfillment.is_disputed ? (
              <Button
                disabled={busy || !reason.trim()}
                variant="destructive"
                onClick={() =>
                  run(
                    () =>
                      raiseFulfillmentDispute(supabase, fulfillment.id, reason),
                    "Shipment dispute recorded."
                  )
                }
              >
                Raise dispute
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {canBuyerCancel ||
      (role === "supplier" && status === "opened") ||
      status === "in_production" ||
      status === "quality_check" ||
      (role === "buyer" &&
        ["shipped", "in_transit", "delivered"].includes(status)) ? (
        <div className="border-t border-neutral-200 pt-5">
          <label className="block text-xs font-medium text-neutral-600">
            Reason or operational note
            <Textarea
              className="mt-1"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required for cancellation, failure, rework, or dispute"
              maxLength={2000}
            />
          </label>
          {role === "buyer" && canBuyerCancel ? (
            <Button
              disabled={busy || !reason.trim()}
              variant="destructive"
              className="mt-3"
              onClick={() =>
                run(
                  () => cancelFulfillment(supabase, fulfillment.id, reason),
                  "Fulfillment cancelled."
                )
              }
            >
              Cancel fulfillment
            </Button>
          ) : null}
          {role === "supplier" && status === "opened" ? (
            <Button
              disabled={busy || !reason.trim()}
              variant="destructive"
              className="mt-3"
              onClick={() =>
                run(
                  () => cancelFulfillment(supabase, fulfillment.id, reason),
                  "Fulfillment cancelled."
                )
              }
            >
              Cancel fulfillment
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
