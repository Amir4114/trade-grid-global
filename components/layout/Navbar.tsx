"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { StartTradingDialog } from "@/components/marketplace/StartTradingDialog"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/supplier", label: "Solutions" },
  { href: "/help-center", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-neutral-950 transition hover:text-amber-700 sm:text-xl"
        >
          Trade Grid Global
        </Link>

        <div className="hidden items-center gap-1 xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 sm:flex xl:ml-0">
          <Button asChild variant="ghost">
            <Link href="/guest">Guest Access</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign In</Link>
          </Button>
          <StartTradingDialog />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="xl:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(90vw,360px)] p-6">
            <SheetTitle>Trade Grid Global</SheetTitle>
            <div className="mt-8 grid gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="justify-start"
                >
                  <Link href={item.href} onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </Link>
                </Button>
              ))}
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/guest" onClick={() => setMobileOpen(false)}>
                  Guest Access
                </Link>
              </Button>
              <Button asChild variant="outline" className="mt-3">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link
                  href="/start-trading"
                  onClick={() => setMobileOpen(false)}
                >
                  Start Trading
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
