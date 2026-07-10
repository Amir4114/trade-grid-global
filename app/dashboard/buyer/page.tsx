"use client";

import Link from "next/link";
import { ArrowRight, FileText, Plus, Search } from "lucide-react";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/AuthProvider";
import { formatVerificationStatus } from "@/lib/dashboard/roles";
import { inquiries, orders, rfqs } from "@/lib/marketplace/data";

export default function BuyerDashboardPage() {
  const { company } = useCompany();
  const openInquiries = inquiries.filter((item) => item.status !== "Closed").length;
  const activeOrders = orders.filter((item) => item.status !== "Draft").length;
  const openRfqs = rfqs.filter((item) => item.status === "Open").length;

  return (
    <DashboardShell
      role="buyer"
      title="Buyer Overview"
      description="Monitor sourcing activity, inquiries, and trade orders from one workspace."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open RFQs" value={String(openRfqs)} detail="Active sourcing requests" accent />
        <StatCard label="Active Inquiries" value={String(openInquiries)} detail="Awaiting supplier response" />
        <StatCard label="Live Orders" value={String(activeOrders)} detail="In negotiation or transit" />
        <StatCard
          label="Verification"
          value={formatVerificationStatus(company?.verification_status ?? "pending")}
          detail={company?.company_name ?? "Company profile"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <DashboardPanel
          title="Recent Inquiries"
          description="Latest supplier conversations across your active categories."
        >
          <DataTable
            columns={[
              { key: "fromCompany", label: "From" },
              { key: "subject", label: "Subject" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Date" },
            ]}
            rows={inquiries.slice(0, 6)}
          />
        </DashboardPanel>

        <DashboardPanel title="Quick Actions">
          <div className="space-y-3">
            <Button asChild className="w-full justify-between">
              <Link href="/rfq">
                <span className="flex items-center gap-2">
                  <Plus className="size-4" />
                  Post new RFQ
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/suppliers">
                <span className="flex items-center gap-2">
                  <Search className="size-4" />
                  Find suppliers
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/dashboard/buyer/orders">
                <span className="flex items-center gap-2">
                  <FileText className="size-4" />
                  View orders
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      </div>

      <div className="mt-6">
        <DashboardPanel
          title="Recent Orders"
          description="Track confirmed and in-transit shipments."
        >
          <DataTable
            columns={[
              { key: "productName", label: "Product" },
              { key: "supplierCompany", label: "Supplier" },
              { key: "value", label: "Value" },
              { key: "status", label: "Status" },
              { key: "updatedAt", label: "Updated" },
            ]}
            rows={orders.slice(0, 5)}
          />
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
