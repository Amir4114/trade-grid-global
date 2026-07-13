"use client";

import Link from "next/link";
import { useState } from "react";

import {
  fetchClientAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError("Login successful but user session not found.");
        return;
      }

      const nextParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;

      const authContext = await fetchClientAuthRedirectContext(data.user.id);

      if (!authContext.role) {
        setError("Unable to load your profile. Contact support.");
        return;
      }

      window.location.assign(
        resolvePostAuthRedirectPath({
          ...authContext,
          nextPath: nextParam,
        })
      );
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-neutral-50 text-neutral-950 lg:grid-cols-2">
      <section className="hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="text-xl font-semibold">Trade Grid Global</div>

        <div>
          <h1 className="text-5xl font-semibold tracking-tight">
            Access your trade workspace.
          </h1>

          <p className="mt-4 text-neutral-300">
            Manage sourcing, RFQs, quotations, products, and verification.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-3xl font-semibold">Login</h1>

          <p className="mt-2 text-sm text-neutral-600">
            Continue as buyer, supplier, or admin.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button className="mt-6 w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>

          <div className="mt-4 flex justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-neutral-600 hover:text-neutral-950"
            >
              Forgot password?
            </Link>

            <Link href="/signup" className="font-medium">
              Create account
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
