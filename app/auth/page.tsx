"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSignup = async () => {
    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (error) {
        alert(error.message);
        return;
      }

      alert(
        "Signup successful. Please login."
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password,
          }
        );

      if (error) {
        alert(error.message);
        return;
      }

      router.push("/onboarding");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

        <h1 className="mb-8 text-center text-4xl font-bold">
          Trade Grid Global
        </h1>

        <div className="space-y-5">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:scale-105"
          >
            Login
          </button>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 py-4 font-semibold transition hover:bg-white/10"
          >
            Signup
          </button>

        </div>

      </div>

    </main>
  );
}