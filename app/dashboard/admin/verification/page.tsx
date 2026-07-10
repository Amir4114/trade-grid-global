"use client";

import { useEffect, useState } from "react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

export default function AdminVerificationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (!error) {
          setCompanies(data ?? []);
        }
        setLoading(false);
      }
    }

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCompanies = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setCompanies(data ?? []);
    }
  };

  const updateStatus = async (
    id: string,
    verification_status: string,
    risk_score?: number
  ) => {
    const supabase = createClient();

    await supabase
      .from("companies")
      .update({
        verification_status,
        ...(risk_score !== undefined ? { risk_score } : {}),
      })
      .eq("id", id);

    await refreshCompanies();
  };

  return (
    <DashboardShell
      role="admin"
      title="Verification Queue"
      description="Review company submissions, approve trusted suppliers, and flag high-risk profiles."
      badge={`${companies.length} companies`}
    >
      {loading ? (
        <DashboardPanel>
          <p className="text-sm text-neutral-500">Loading verification queue...</p>
        </DashboardPanel>
      ) : companies.length === 0 ? (
        <DashboardPanel>
          <p className="text-sm text-neutral-500">No companies pending review.</p>
        </DashboardPanel>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <DashboardPanel key={company.id}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold text-neutral-950">
                    {company.company_name}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {company.country} · {company.business_type}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Status:{" "}
                    <span className="font-medium text-neutral-950">
                      {company.verification_status}
                    </span>
                  </p>
                  <p className="text-sm text-neutral-600">
                    Risk score:{" "}
                    <span className="font-medium text-neutral-950">
                      {company.risk_score}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(company.id, "verified", 0)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                    onClick={() => updateStatus(company.id, "under_review")}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(company.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
