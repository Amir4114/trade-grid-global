import Link from "next/link"

import { cn } from "@/lib/utils"

export function OrdersSegmentNav({
  role,
  active,
}: {
  role: "buyer" | "supplier"
  active: "purchase-orders" | "fulfillment"
}) {
  const base = `/dashboard/${role}/orders`
  const items = [
    { key: "purchase-orders", label: "Purchase Orders", href: base },
    {
      key: "fulfillment",
      label: "Fulfillment",
      href: `${base}?tab=fulfillment`,
    },
  ] as const

  return (
    <nav
      aria-label="Order workspace sections"
      className="mb-6 flex w-fit rounded-lg border border-neutral-200 bg-white p-1"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition",
            active === item.key
              ? "bg-neutral-950 text-white"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
