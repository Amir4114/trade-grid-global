"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        alert(error.message);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError) {
        alert(profileError.message);
        return;
      }

      if (profile?.role !== "admin") {
        alert("Access denied");

        await supabase.auth.signOut();

        return;
      }

      router.push("/admin");

    } catch (err) {
      console.error(err);

      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">

        <h1 className="mb-8 text-center text-4xl font-bold">
          Admin Login
        </h1>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Admin Email"
            className="w-full rounded-xl bg-black/40 p-4 outline-none"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl bg-black/40 p-4 outline-none"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-white py-4 font-medium text-black"
          >
            {loading ? "Loading..." : "Login"}
          </button>

        </div>

      </div>

    </main>
  );
}