"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        toast.error("Password update failed", { description: updateError.message });
        setError(updateError.message);
        return;
      }

      // End the recovery session so the user must sign in with the new password.
      await supabase.auth.signOut();

      toast.success("Password updated", {
        description: "Sign in with your new password.",
      });
      setSuccess(true);
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("Password update failed", {
        description: "Something went wrong while updating your password.",
      });
      setError("Something went wrong while updating your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">Set a new password</h1>

        {checkingSession ? (
          <p className="mt-4 text-sm text-neutral-600">
            Validating your reset link...
          </p>
        ) : !hasRecoverySession ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              This password reset link is invalid or has expired. Please request
              a new one.
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : success ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Your password has been updated. Redirecting you to login...
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <p className="text-sm text-neutral-600">
              Choose a strong password of at least {MIN_PASSWORD_LENGTH}{" "}
              characters.
            </p>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              <PasswordInput
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <PasswordInput
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button className="mt-6 w-full" type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update password"}
            </Button>

            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
