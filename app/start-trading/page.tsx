import { StartTradingOptions } from "@/components/marketplace/StartTradingDialog"
import Navbar from "@/components/layout/Navbar"

export default function StartTradingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
            Start Trading
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Choose your marketplace experience
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Browse as a guest or create the account that matches how your
            company trades.
          </p>
          <div className="mt-6">
            <StartTradingOptions />
          </div>
        </div>
      </section>
    </main>
  )
}
