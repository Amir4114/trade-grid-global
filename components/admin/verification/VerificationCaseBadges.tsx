import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  PRIORITY_LABELS,
  SLA_STATE_LABELS,
  type SlaState,
  type VerificationCasePriority,
  type VerificationCaseStatus,
  type VerificationCaseType,
} from "@/lib/verification/types";
import {
  priorityBadgeClass,
  slaBadgeClass,
  statusBadgeClass,
} from "@/lib/verification/sla";
import { cn } from "@/lib/utils";

export function CaseTypeBadge({ caseType }: { caseType: VerificationCaseType }) {
  return (
    <span className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700">
      {CASE_TYPE_LABELS[caseType]}
    </span>
  );
}

export function CaseStatusBadge({ status }: { status: VerificationCaseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        statusBadgeClass(status)
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: VerificationCasePriority }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        priorityBadgeClass(priority)
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function SlaBadge({ state }: { state: SlaState | null }) {
  if (!state) {
    return (
      <span className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-500">
        Closed
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        slaBadgeClass(state)
      )}
    >
      {SLA_STATE_LABELS[state]}
    </span>
  );
}
