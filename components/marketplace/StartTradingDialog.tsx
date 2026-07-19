"use client"

import Link from "next/link"
import { Building2, Eye, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const entryOptions = [
  {
    title: "Continue as Guest",
    description: "Browse the public marketplace with read-only access.",
    href: "/guest",
    icon: Eye,
  },
  {
    title: "Create Buyer Account",
    description: "Source suppliers, create RFQs, and manage procurement.",
    href: "/signup?role=buyer",
    icon: ShoppingCart,
  },
  {
    title: "Create Supplier Account",
    description: "List products, respond to RFQs, and build verified trust.",
    href: "/signup?role=supplier",
    icon: Building2,
  },
] as const

export function StartTradingOptions() {
  return (
    <div className="grid gap-3">
      {entryOptions.map((option) => {
        const Icon = option.icon
        return (
          <Button
            key={option.href}
            asChild
            variant="outline"
            className="h-auto justify-start gap-4 p-4 text-left"
          >
            <Link href={option.href}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-amber-400">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold text-neutral-950">
                  {option.title}
                </span>
                <span className="mt-1 block text-sm font-normal text-neutral-500">
                  {option.description}
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

export function StartTradingDialog({
  triggerClassName,
}: {
  triggerClassName?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>Start Trading</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Choose your marketplace experience
          </DialogTitle>
          <DialogDescription>
            Browse as a guest or create the account that matches how your
            company trades.
          </DialogDescription>
        </DialogHeader>
        <StartTradingOptions />
      </DialogContent>
    </Dialog>
  )
}
