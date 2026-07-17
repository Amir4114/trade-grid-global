export type VerificationCaseType = "company_verification" | "product_review";

export type VerificationCaseStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type VerificationCasePriority = "low" | "normal" | "high" | "urgent";

export type VerificationCaseSource =
  | "user_submission"
  | "system"
  | "ai_assisted"
  | "automation";

export type VerificationActorType = "user" | "admin" | "system" | "ai";

export type VerificationAssessmentResult =
  | "pass"
  | "fail"
  | "warning"
  | "unknown";

export type SlaState = "on_track" | "due_soon" | "overdue";

export type VerificationCase = {
  id: string;
  case_type: VerificationCaseType;
  entity_id: string;
  subject_user_id: string | null;
  company_id: string | null;
  status: VerificationCaseStatus;
  priority: VerificationCasePriority;
  submitted_at: string;
  review_started_at: string | null;
  decided_at: string | null;
  assigned_admin_id: string | null;
  decision_reason: string | null;
  sla_due_at: string;
  sla_breached_at: string | null;
  source: VerificationCaseSource;
  created_at: string;
  updated_at: string;
};

export type VerificationCaseEvent = {
  id: string;
  case_id: string;
  event_type: string;
  actor_type: VerificationActorType;
  actor_user_id: string | null;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type VerificationAssessment = {
  id: string;
  case_id: string;
  assessor_type: "rule" | "ai" | "admin";
  assessor_name: string;
  assessment_type: string;
  result: VerificationAssessmentResult;
  confidence: number | null;
  summary: string | null;
  findings: Record<string, unknown>;
  created_at: string;
};

export type VerificationCaseSummary = VerificationCase & {
  sla_state: SlaState | null;
  entity_name: string;
  company_name: string | null;
  waiting_label: string;
};

export type VerificationCaseDetail = {
  case: VerificationCase;
  sla_state: SlaState | null;
  events: VerificationCaseEvent[];
  assessments: VerificationAssessment[];
  company: import("@/lib/database/types").Company | null;
  product: import("@/lib/database/types").Product | null;
  documents: import("@/lib/database/types").CompanyDocument[];
};

export type VerificationQueueFilters = {
  q?: string;
  caseType?: VerificationCaseType | "all";
  status?: VerificationCaseStatus | "active" | "all";
  priority?: VerificationCasePriority | "all";
  sla?: SlaState | "all";
  sort?: "oldest" | "newest" | "sla" | "priority";
};

export type VerificationQueueStats = {
  totalPending: number;
  inReview: number;
  dueSoon: number;
  overdue: number;
};

export const CASE_TYPE_LABELS: Record<VerificationCaseType, string> = {
  company_verification: "Company Verification",
  product_review: "Product Review",
};

export const CASE_STATUS_LABELS: Record<VerificationCaseStatus, string> = {
  pending: "Pending",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<VerificationCasePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const SLA_STATE_LABELS: Record<SlaState, string> = {
  on_track: "On Track",
  due_soon: "Due Soon",
  overdue: "Overdue",
};

export const PRIORITY_ORDER: Record<VerificationCasePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};
