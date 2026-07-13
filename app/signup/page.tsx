"use client";

import Link from "next/link";
import { useState } from "react";

import {
  fetchClientAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";
import { registerMarketplaceAccount } from "@/lib/auth/signup";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";

type AccountType = "buyer" | "supplier";

export default function SignupPage() {
  const supabase = createClient();

  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("User creation failed.");
        return;
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      await registerMarketplaceAccount({
        supabase,
        userId: data.user.id,
        email,
        fullName,
        companyName,
        accountType,
      });

      const authContext = await fetchClientAuthRedirectContext(data.user.id);

      window.location.assign(resolvePostAuthRedirectPath(authContext));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Something went wrong during signup."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <form
        onSubmit={handleSignup}
        className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-3xl font-semibold">Create your marketplace account</h1>

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
  );
}
