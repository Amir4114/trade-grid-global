import type { SlaState, VerificationCase, VerificationCaseStatus } from "./types";

const ACTIVE_STATUSES: VerificationCaseStatus[] = ["pending", "in_review"];

export function computeSlaState(
  submittedAt: string,
  slaDueAt: string,
  status: VerificationCaseStatus,
  now = Date.now()
): SlaState | null {
  if (!ACTIVE_STATUSES.includes(status)) {
    return null;
  }

  const submittedMs = new Date(submittedAt).getTime();
  const dueMs = new Date(slaDueAt).getTime();

  if (Number.isNaN(submittedMs) || Number.isNaN(dueMs) || dueMs <= submittedMs) {
    return now > dueMs ? "overdue" : "on_track";
  }

  if (now > dueMs) {
    return "overdue";
  }

  const windowMs = dueMs - submittedMs;
  const remainingMs = dueMs - now;

  if (remainingMs <= windowMs * 0.25) {
    return "due_soon";
  }

  return "on_track";
}

export function formatWaitingDuration(submittedAt: string, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(submittedAt).getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slaBadgeClass(state: SlaState | null): string {
  switch (state) {
    case "overdue":
      return "border-red-200 bg-red-50 text-red-700";
    case "due_soon":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "on_track":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
  }
}

export function priorityBadgeClass(priority: VerificationCase["priority"]): string {
  switch (priority) {
    case "urgent":
      return "border-red-300 bg-red-50 text-red-800";
    case "high":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "low":
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
    default:
      return "border-neutral-200 bg-white text-neutral-700";
  }
}

export function statusBadgeClass(status: VerificationCaseStatus): string {
  switch (status) {
    case "in_review":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "cancelled":
      return "border-neutral-200 bg-neutral-100 text-neutral-600";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export function defaultSlaHours(caseType: VerificationCase["case_type"]): number {
  return caseType === "product_review" ? 12 : 24;
}
