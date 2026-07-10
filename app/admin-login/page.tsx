"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchClientAuthRedirectContext,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/redirects";

export default function AdminLoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Admin login failed.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error("Admin profile not found.");
      }

      if (profile.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error(
          "Access denied. Admin account required."
        );
      }

      window.location.replace(
        resolvePostAuthRedirectPath(
          await fetchClientAuthRedirectContext(data.user.id)
        )
      );
    } catch (err) {
      console.error("Admin Login Error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">

        <h1 className="mb-8 text-center text-4xl font-bold">
          Admin Login
        </h1>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-xl bg-black/40 p-4 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-white"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-xl bg-black/40 p-4 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-white"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}