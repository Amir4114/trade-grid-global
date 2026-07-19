import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  FileText,
  Package,
  PackageSearch,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react"

import type { UserRole } from "@/lib/marketplace/types"

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const buyerNav: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/buyer", icon: BarChart3 },
  { label: "My RFQs", href: "/dashboard/buyer/rfqs", icon: FileText },
  { label: "Saved Suppliers", href: "/dashboard/buyer/suppliers", icon: Users },
  { label: "Inquiries", href: "/dashboard/buyer/inquiries", icon: Bell },
  {
    label: "Quotations",
    href: "/dashboard/buyer/quotations",
    icon: PackageSearch,
  },
  { label: "Orders", href: "/dashboard/buyer/orders", icon: Package },
  { label: "Analytics", href: "/dashboard/buyer/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/buyer/settings", icon: Settings },
]

const supplierNav: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/supplier", icon: BarChart3 },
  { label: "Products", href: "/dashboard/supplier/products", icon: Package },
  { label: "RFQs", href: "/dashboard/supplier/rfqs", icon: FileText },
  { label: "Quotations", href: "/dashboard/supplier/quotations", icon: Bell },
  { label: "Awards", href: "/dashboard/supplier/awards", icon: PackageSearch },
  { label: "Orders", href: "/dashboard/supplier/orders", icon: Package },
  {
    label: "Verification",
    href: "/onboarding/supplier?section=documents",
    icon: ShieldCheck,
  },
  {
    label: "Analytics",
    href: "/dashboard/supplier/analytics",
    icon: BarChart3,
  },
  { label: "Settings", href: "/dashboard/supplier/settings", icon: Settings },
]

const adminNav: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/admin", icon: BarChart3 },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  {
    label: "Verification Ops",
    href: "/dashboard/admin/verification",
    icon: ShieldCheck,
  },
  {
    label: "Product Management",
    href: "/dashboard/admin/products",
    icon: Package,
  },
  { label: "RFQs", href: "/dashboard/admin/rfqs", icon: FileText },
  { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
]

export const dashboardNavigation: Record<UserRole, DashboardNavItem[]> = {
  buyer: buyerNav,
  supplier: supplierNav,
  admin: adminNav,
}

export function getDashboardNavigation(role: UserRole): DashboardNavItem[] {
  return dashboardNavigation[role]
}
