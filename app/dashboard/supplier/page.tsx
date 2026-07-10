"use client";

import Link from "next/link";
import { ArrowRight, Package, Plus, ShieldCheck } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/AuthProvider";
import { formatVerificationStatus } from "@/lib/dashboard/roles";
import { quotes, rfqs } from "@/lib/marketplace/data";

export default function SupplierDashboardPage() {
  const { company } = useCompany();
  const openRfqs = rfqs.filter((item) => item.status === "Open").length;

  return (
    <DashboardShell
      role="supplier"
      title="Supplier Overview"
      description="Manage products, respond to RFQs, and grow verified export relationships."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Listed Products"
          value={String(company?.categories.length ?? 0)}
          detail="Active export categories"
          accent
        />
        <StatCard label="Open RFQs" value={String(openRfqs)} detail="Matching your categories" />
        <StatCard label="Quotations Sent" value={String(quotes.length)} detail="Last 30 days" />
        <StatCard
          label="Verification"
          value={formatVerificationStatus(company?.verification_status ?? "pending")}
          detail={`Risk score ${company?.risk_score ?? 50}`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <DashboardPanel
          title="Matching RFQs"
          description="Buyer requests aligned with your export categories."
        >
          <DataTable
            columns={[
              { key: "productName", label: "Product" },
              { key: "buyerCompany", label: "Buyer" },
              { key: "quantity", label: "Quantity" },
              { key: "status", label: "Status" },
              { key: "deadline", label: "Deadline" },
            ]}
            rows={rfqs.slice(0, 6)}
          />
        </DashboardPanel>

        <DashboardPanel title="Quick Actions">
          <div className="space-y-3">
            <Button asChild className="w-full justify-between">
              <Link href="/dashboard/supplier/products">
                <span className="flex items-center gap-2">
                  <Plus className="size-4" />
                  Add product
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/dashboard/supplier/rfqs">
                <span className="flex items-center gap-2">
                  <Package className="size-4" />
                  Browse RFQs
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/onboarding/verification">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  Upload certifications
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
