"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { products, rfqs, suppliers } from "@/lib/marketplace/data";

type CompanyRow = {
  company_name: string;
  country: string;
  verification_status: string;
  risk_score: number;
};

export default function AdminDashboardPage() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const fetchPending = async () => {
      const { count } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending");

      setPendingCount(count ?? 0);
    };

    fetchPending();
  }, []);

  const verificationRows: CompanyRow[] = suppliers.slice(0, 5).map((supplier) => ({
    company_name: supplier.companyName,
    country: supplier.country,
    verification_status: supplier.verificationState,
    risk_score: 100 - supplier.trustScore,
  }));

  return (
    <DashboardShell
      role="admin"
      title="Admin Overview"
      description="Platform health, verification queue, and trade activity at a glance."
      badge="Operations"
      actions={
        <Button asChild size="sm">
          <Link href="/dashboard/admin/verification">
            <ShieldCheck className="size-4" />
            Verification queue
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered Suppliers" value={String(suppliers.length)} detail="Active marketplace profiles" accent />
        <StatCard label="Listed Products" value={String(products.length)} detail="Across all categories" />
        <StatCard label="Open RFQs" value={String(rfqs.filter((r) => r.status === "Open").length)} detail="Awaiting quotes" />
        <StatCard label="Pending Verification" value={String(pendingCount)} detail="Requires admin review" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <DashboardPanel
          title="Verification Snapshot"
          description="Recent supplier verification states across the platform."
        >
          <DataTable
            columns={[
              { key: "company_name", label: "Company" },
              { key: "country", label: "Country" },
              { key: "verification_status", label: "Status" },
              { key: "risk_score", label: "Risk Score" },
            ]}
            rows={verificationRows}
          />
        </DashboardPanel>

        <DashboardPanel title="Admin Actions">
          <div className="space-y-3">
            <Button asChild className="w-full justify-between">
              <Link href="/dashboard/admin/verification">
                <span>Review verifications</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/dashboard/admin/users">
                <span>Manage users</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/dashboard/admin/analytics">
                <span>View analytics</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
