import Link from "next/link";
import { Bot, FileText, Grid3X3, LayoutDashboard, PackageSearch, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/marketplace", label: "Marketplace", icon: Grid3X3 },
  { href: "/products", label: "Products", icon: PackageSearch },
  { href: "/suppliers", label: "Suppliers", icon: Store },
  { href: "/buyers", label: "Buyers", icon: Users },
  { href: "/rfq", label: "RFQs", icon: FileText },
  { href: "/ai-trade-assistant", label: "AI", icon: Bot },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-950">
            Trade Grid Global
          </Link>
          <div className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950">
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/dashboard/buyer"><LayoutDashboard />Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Join Free</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
