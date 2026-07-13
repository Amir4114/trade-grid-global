"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        "/reset-password"
      )}`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      setMessage(
        "If an account exists for this email, a password reset link has been sent. Please check your inbox."
      );
    } catch (err) {
      console.error("Reset Password:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-3xl font-semibold">
          Reset Password
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          Enter your registered business email.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        <Input
          className="mt-6"
          type="email"
          placeholder="Business Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button
          className="mt-6 w-full"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Sending..."
            : "Send Reset Link"}
        </Button>

        <Button
          asChild
          variant="outline"
          className="mt-3 w-full"
        >
          <Link href="/login">
            Back to Login
          </Link>
        </Button>
      </form>
    </main>
  );
}