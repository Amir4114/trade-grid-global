import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import { inquiries, orders, products, rfqs, suppliers } from "@/lib/marketplace/data";

export default function AdminAnalyticsPage() {
  const confirmedOrders = orders.filter((order) => order.status === "Confirmed").length;
  const quotedRfqs = rfqs.filter((rfq) => rfq.status === "Quoted").length;

  return (
    <DashboardShell
      role="admin"
      title="Analytics"
      description="Platform-wide trade activity and operational metrics."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Suppliers" value={String(suppliers.length)} accent />
        <StatCard label="Total Products" value={String(products.length)} />
        <StatCard label="Quoted RFQs" value={String(quotedRfqs)} />
        <StatCard label="Confirmed Orders" value={String(confirmedOrders)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Trade Volume">
          <p className="text-3xl font-semibold text-neutral-950">USD 4.2M</p>
          <p className="mt-1 text-sm text-neutral-500">
            Estimated gross merchandise value this quarter
          </p>
        </DashboardPanel>
        <DashboardPanel title="Engagement">
          <p className="text-3xl font-semibold text-neutral-950">{inquiries.length}</p>
          <p className="mt-1 text-sm text-neutral-500">
            Active buyer-supplier inquiries on platform
          </p>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
