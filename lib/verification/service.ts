import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Company,
  CompanyDocument,
  Database,
  Product,
} from "@/lib/database/types";
import {
  computeSlaState,
  formatWaitingDuration,
} from "@/lib/verification/sla";
import type {
  VerificationAssessment,
  VerificationCase,
  VerificationCaseDetail,
  VerificationCaseEvent,
  VerificationCasePriority,
  VerificationCaseSummary,
  VerificationQueueFilters,
  VerificationQueueStats,
} from "@/lib/verification/types";
import { PRIORITY_ORDER } from "@/lib/verification/types";

type Client = SupabaseClient<Database>;

function mapCase(row: Record<string, unknown>): VerificationCase {
  return row as unknown as VerificationCase;
}

function mapEvent(row: Record<string, unknown>): VerificationCaseEvent {
  return {
    id: String(row.id),
    case_id: String(row.case_id),
    event_type: String(row.event_type),
    actor_type: row.actor_type as VerificationCaseEvent["actor_type"],
    actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
    from_status: row.from_status ? String(row.from_status) : null,
    to_status: row.to_status ? String(row.to_status) : null,
    message: row.message ? String(row.message) : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
  };
}

function mapAssessment(row: Record<string, unknown>): VerificationAssessment {
  return {
    id: String(row.id),
    case_id: String(row.case_id),
    assessor_type: row.assessor_type as VerificationAssessment["assessor_type"],
    assessor_name: String(row.assessor_name),
    assessment_type: String(row.assessment_type),
    result: row.result as VerificationAssessment["result"],
    confidence:
      row.confidence === null || row.confidence === undefined
        ? null
        : Number(row.confidence),
    summary: row.summary ? String(row.summary) : null,
    findings:
      row.findings && typeof row.findings === "object" && !Array.isArray(row.findings)
        ? (row.findings as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
  };
}

async function fetchCompaniesByIds(
  supabase: Client,
  ids: string[]
): Promise<Map<string, Company>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .in("id", [...new Set(ids)]);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchProductsByIds(
  supabase: Client,
  ids: string[]
): Promise<Map<string, Product>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", [...new Set(ids)]);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

function enrichCaseSummary(
  item: VerificationCase,
  companies: Map<string, Company>,
  products: Map<string, Product>
): VerificationCaseSummary {
  const sla_state = computeSlaState(
    item.submitted_at,
    item.sla_due_at,
    item.status
  );

  let entity_name = "Unknown";
  let company_name: string | null = null;

  if (item.case_type === "company_verification") {
    const company = companies.get(item.entity_id);
    entity_name = company?.company_name ?? "Company";
    company_name = company?.company_name ?? null;
  } else {
    const product = products.get(item.entity_id);
    entity_name = product?.name ?? "Product";
    const company = item.company_id ? companies.get(item.company_id) : undefined;
    company_name = company?.company_name ?? null;
  }

  return {
    ...item,
    sla_state,
    entity_name,
    company_name,
    waiting_label: formatWaitingDuration(item.submitted_at),
  };
}

export async function listVerificationCases(
  supabase: Client,
  filters: VerificationQueueFilters = {}
): Promise<VerificationCaseSummary[]> {
  let query = supabase
    .from("verification_cases")
    .select("*")
    .order("submitted_at", { ascending: filters.sort === "newest" ? false : true });

  if (filters.status === "active") {
    query = query.in("status", ["pending", "in_review"]);
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.caseType && filters.caseType !== "all") {
    query = query.eq("case_type", filters.caseType);
  }

  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const cases = (data ?? []).map((row) => mapCase(row as Record<string, unknown>));

  const companyIds = cases.flatMap((item) =>
    item.company_id ? [item.company_id] : item.case_type === "company_verification" ? [item.entity_id] : []
  );
  const productIds = cases
    .filter((item) => item.case_type === "product_review")
    .map((item) => item.entity_id);

  const [companies, products] = await Promise.all([
    fetchCompaniesByIds(supabase, companyIds),
    fetchProductsByIds(supabase, productIds),
  ]);

  let rows = cases.map((item) => enrichCaseSummary(item, companies, products));

  if (filters.q?.trim()) {
    const term = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.entity_name.toLowerCase().includes(term) ||
        (row.company_name?.toLowerCase().includes(term) ?? false)
    );
  }

  if (filters.sla && filters.sla !== "all") {
    rows = rows.filter((row) => row.sla_state === filters.sla);
  }

  if (filters.sort === "sla") {
    rows.sort(
      (a, b) =>
        new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime()
    );
  } else if (filters.sort === "priority") {
    rows.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );
  } else if (filters.sort === "newest") {
    rows.sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  } else {
    rows.sort(
      (a, b) =>
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
  }

  return rows;
}

export function buildVerificationQueueStats(
  rows: VerificationCaseSummary[]
): VerificationQueueStats {
  const active = rows.filter((row) =>
    row.status === "pending" || row.status === "in_review"
  );

  return {
    totalPending: active.filter((row) => row.status === "pending").length,
    inReview: active.filter((row) => row.status === "in_review").length,
    dueSoon: active.filter((row) => row.sla_state === "due_soon").length,
    overdue: active.filter((row) => row.sla_state === "overdue").length,
  };
}

export async function getVerificationCaseDetail(
  supabase: Client,
  caseId: string
): Promise<VerificationCaseDetail | null> {
  const { data: caseRow, error: caseError } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) {
    throw new Error(caseError.message);
  }

  if (!caseRow) {
    return null;
  }

  const item = mapCase(caseRow as Record<string, unknown>);

  const [{ data: events, error: eventsError }, { data: assessments, error: assessmentsError }] =
    await Promise.all([
      supabase
        .from("verification_case_events")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true }),
      supabase
        .from("verification_assessments")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false }),
    ]);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  if (assessmentsError) {
    throw new Error(assessmentsError.message);
  }

  let company: Company | null = null;
  let product: Product | null = null;
  let documents: CompanyDocument[] = [];

  if (item.case_type === "company_verification") {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", item.entity_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    company = data;

    if (company) {
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", company.id)
        .order("uploaded_at", { ascending: false });

      if (docsError) {
        throw new Error(docsError.message);
      }

      documents = docs ?? [];
    }
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", item.entity_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    product = data;

    if (product?.company_id) {
      const { data: co, error: coError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", product.company_id)
        .maybeSingle();

      if (coError) {
        throw new Error(coError.message);
      }

      company = co;
    }
  }

  return {
    case: item,
    sla_state: computeSlaState(item.submitted_at, item.sla_due_at, item.status),
    events: (events ?? []).map((row) => mapEvent(row as Record<string, unknown>)),
    assessments: (assessments ?? []).map((row) =>
      mapAssessment(row as Record<string, unknown>)
    ),
    company,
    product,
    documents,
  };
}

export async function startVerificationCaseReview(
  supabase: Client,
  caseId: string
): Promise<VerificationCase> {
  const { data, error } = await supabase.rpc("start_verification_case_review", {
    p_case_id: caseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapCase(data as Record<string, unknown>);
}

export async function setVerificationCasePriority(
  supabase: Client,
  caseId: string,
  priority: VerificationCasePriority
): Promise<VerificationCase> {
  const { data, error } = await supabase.rpc("set_verification_case_priority", {
    p_case_id: caseId,
    p_priority: priority,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapCase(data as Record<string, unknown>);
}

export async function approveCompanyVerification(
  supabase: Client,
  companyId: string,
  riskScore = 0
): Promise<Company> {
  const { data, error } = await supabase.rpc("approve_company_verification", {
    p_company_id: companyId,
    p_risk_score: riskScore,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Company;
}

export async function rejectCompanyVerification(
  supabase: Client,
  companyId: string,
  reason: string
): Promise<Company> {
  const { data, error } = await supabase.rpc("reject_company_verification", {
    p_company_id: companyId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Company;
}

export async function approveProductViaCase(
  supabase: Client,
  productId: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("approve_product", {
    product_id: productId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function rejectProductViaCase(
  supabase: Client,
  productId: string,
  reason: string
): Promise<Product> {
  const { data, error } = await supabase.rpc("reject_product", {
    product_id: productId,
    reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

/** Map entity_id → active verification case id for admin product management links. */
export async function findActiveVerificationCasesByEntityIds(
  supabase: Client,
  caseType: "company_verification" | "product_review",
  entityIds: string[]
): Promise<Map<string, string>> {
  if (entityIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("verification_cases")
    .select("id, entity_id")
    .eq("case_type", caseType)
    .in("entity_id", [...new Set(entityIds)])
    .in("status", ["pending", "in_review"]);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((row) => [String(row.entity_id), String(row.id)])
  );
}
