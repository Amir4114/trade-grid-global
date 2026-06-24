import Link from "next/link";
import { BarChart3, Bell, FileText, PackageSearch, Settings, ShieldCheck, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const roleLinks = {
  buyer: ["Overview", "Saved Suppliers", "Inquiries", "Quotations", "Orders", "Settings"],
  supplier: ["Overview", "Products", "RFQs", "Quotations", "Certifications", "Settings"],
  admin: ["Overview", "Users", "Products", "RFQs", "Verification", "Analytics"],
};

const icons = [BarChart3, Users, PackageSearch, FileText, ShieldCheck, Settings];

export default function DashboardShell({ role, title, children }: { role: keyof typeof roleLinks; title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{role} workspace</div>
          <nav className="mt-2 space-y-1">
            {roleLinks[role].map((item, index) => {
              const Icon = icons[index] ?? Bell;
              return (
                <Link key={item} href="#" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950">
                  <Icon className="size-4" />
                  {item}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Dashboard</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
            </div>
            <div className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600">3 notifications</div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
