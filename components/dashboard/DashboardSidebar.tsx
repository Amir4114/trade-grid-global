"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import type { DashboardNavItem } from "@/lib/dashboard/navigation"
import { roleLabel } from "@/lib/dashboard/roles"
import type { UserRole } from "@/lib/marketplace/types"
import { cn } from "@/lib/utils"

type DashboardSidebarProps = {
  role: UserRole
  items: DashboardNavItem[]
  onNavigate?: () => void
  className?: string
}

export default function DashboardSidebar({
  role,
  items,
  onNavigate,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-neutral-950 text-white",
        className
      )}
    >
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-500/90 uppercase">
          Workspace
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight">
          {roleLabel(role)}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon
          const itemPath = item.href.split("?")[0]
          const isActive =
            pathname === itemPath ||
            (itemPath !== `/dashboard/${role}` && pathname.startsWith(itemPath))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-2 border-amber-500 bg-white/10 text-white"
                  : "border-l-2 border-transparent text-neutral-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive
                    ? "text-amber-500"
                    : "text-neutral-500 group-hover:text-neutral-300"
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-neutral-500">Trade Grid Global</p>
        <p className="mt-0.5 text-xs text-neutral-600">
          Enterprise trade platform
        </p>
      </div>
    </aside>
  )
}
