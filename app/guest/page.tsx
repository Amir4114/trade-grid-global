import Link from "next/link"
import { Clock3, LockKeyhole } from "lucide-react"

import { GuestAccessForm } from "@/components/guest/GuestAccessForm"
import Navbar from "@/components/layout/Navbar"

export default function GuestAccessPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <section>
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
            Guest marketplace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Explore global food trade before creating an account.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600">
            Guest access is read-only. Your details create a temporary browser
            session and are not registered as a Buyer, Supplier, or company.
          </p>

          <div className="mt-8 space-y-4 text-sm text-neutral-700">
            <p className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-700" />
              Guest sessions expire automatically after two hours.
            </p>
            <p className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-700" />
              Posting RFQs, quotations, products, awards, and orders requires a
              verified marketplace account.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold">Continue as guest</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Enter your contact details to begin a read-only marketplace session.
          </p>
          <div className="mt-6">
            <GuestAccessForm />
          </div>
          <p className="mt-6 text-center text-sm text-neutral-500">
            Ready to trade?{" "}
            <Link
              href="/signup"
              className="font-semibold text-neutral-950 underline"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
