"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  fetchClientAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects"
import { recoverIncompleteMarketplaceAccount } from "@/lib/auth/signup"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/PasswordInput"

type AccountType = "buyer" | "supplier"

function isAlreadyRegisteredError(error: {
  code?: string
  message: string
  status?: number
}): boolean {
  return (
    error.code === "user_already_exists" ||
    /already (?:been )?registered|user already exists/i.test(error.message)
  )
}

export default function SignupPage() {
  const supabase = createClient()

  const [accountType, setAccountType] = useState<AccountType>("buyer")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const requestedRole = new URLSearchParams(window.location.search).get(
        "role"
      )
      if (requestedRole === "buyer" || requestedRole === "supplier") {
        setAccountType(requestedRole)
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            tradegrid_marketplace_signup: true,
            marketplace_role: accountType,
            full_name: fullName,
            company_name: companyName,
          },
        },
      })

      const existingAccount =
        (signUpError && isAlreadyRegisteredError(signUpError)) ||
        (!signUpError &&
          Array.isArray(data.user?.identities) &&
          data.user.identities.length === 0)

      if (existingAccount) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password })

        if (signInError || !signInData.user) {
          const message =
            "This email is already registered. Sign in with your existing account."
          toast.error("Account already exists", { description: message })
          setError(message)
          return
        }

        const recovery = await recoverIncompleteMarketplaceAccount({
          supabase,
          userId: signInData.user.id,
          fullName,
          companyName,
          accountType,
        })

        if (recovery.status === "already_provisioned") {
          await supabase.auth.signOut()
          const message =
            "This marketplace account is already complete. Sign in instead."
          toast.error("Account already exists", { description: message })
          setError(message)
          return
        }

        toast.success("Account recovered", {
          description:
            "Your incomplete registration was repaired. Continue onboarding.",
        })

        const recoveredContext = await fetchClientAuthRedirectContext(
          signInData.user.id
        )
        window.location.assign(resolvePostAuthRedirectPath(recoveredContext))
        return
      }

      if (signUpError) {
        toast.error("Signup failed", { description: signUpError.message })
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError("User creation failed.")
        return
      }

      toast.success("Account created", {
        description: data.session
          ? accountType === "supplier"
            ? "Complete your company profile to start listing products."
            : "Complete your company profile to unlock more features."
          : "Check your email to confirm your account before signing in.",
      })

      if (!data.session) {
        window.location.assign("/login")
        return
      }

      const authContext = await fetchClientAuthRedirectContext(data.user.id)

      window.location.assign(resolvePostAuthRedirectPath(authContext))
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong during signup."
      toast.error("Signup failed", { description: message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <form
        onSubmit={handleSignup}
        className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-3xl font-semibold">
          Create your marketplace account
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          Choose how you trade on Trade Grid Global.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border p-4 transition ${
              accountType === "buyer"
                ? "border-black bg-black text-white"
                : "border-neutral-200"
            }`}
          >
            <input
              type="radio"
              checked={accountType === "buyer"}
              onChange={() => setAccountType("buyer")}
              className="mr-2"
            />
            Importer / Buyer
            <p
              className={`mt-2 text-sm ${
                accountType === "buyer"
                  ? "text-neutral-300"
                  : "text-neutral-600"
              }`}
            >
              Search suppliers, post RFQs and manage quotations.
            </p>
          </label>

          <label
            className={`cursor-pointer rounded-xl border p-4 transition ${
              accountType === "supplier"
                ? "border-black bg-black text-white"
                : "border-neutral-200"
            }`}
          >
            <input
              type="radio"
              checked={accountType === "supplier"}
              onChange={() => setAccountType("supplier")}
              className="mr-2"
            />
            Exporter / Supplier
            <p
              className={`mt-2 text-sm ${
                accountType === "supplier"
                  ? "text-neutral-300"
                  : "text-neutral-600"
              }`}
            >
              Create profile, list products and respond to RFQs.
            </p>
          </label>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            placeholder="Business Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="mt-6 h-12 w-full" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </Button>

        <p className="mt-4 text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neutral-950">
            Login
          </Link>
        </p>
      </form>
    </main>
  )
}
