"use client"

import { useState } from "react"
import { ArrowRight, Eye, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function GuestAccessForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch("/api/guest/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      })
      const result = (await response.json()) as {
        error?: string
        redirectTo?: string
      }

      if (!response.ok || !result.redirectTo) {
        throw new Error(result.error ?? "Unable to start guest access.")
      }

      window.location.assign(result.redirectTo)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start guest access."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Name
        <Input
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={100}
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Business email
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          maxLength={254}
          required
        />
      </label>

      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting ? "Starting guest access..." : "Continue to marketplace"}
        <ArrowRight className="size-4" />
      </Button>

      <div className="grid gap-3 border-t border-neutral-200 pt-5 text-sm text-neutral-600 sm:grid-cols-2">
        <p className="flex gap-2">
          <Eye className="mt-0.5 size-4 shrink-0 text-amber-700" />
          Browse products, suppliers, buyers, and public RFQs.
        </p>
        <p className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-700" />
          Dashboard and trading actions remain unavailable.
        </p>
      </div>
    </form>
  )
}
