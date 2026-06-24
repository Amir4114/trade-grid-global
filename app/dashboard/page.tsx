"use client";

import { useEffect, useState } from "react";

type User = {
  email: string;
  role: string;
};

export default function DashboardPage() {

  const [mounted, setMounted] =
    useState(false);

  const [user, setUser] =
    useState<User | null>(null);

  useEffect(() => {

    setMounted(true);

    const storedUser =
      localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

  }, []);

  // PREVENT HYDRATION ERRORS
  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">

      <h1 className="text-4xl font-bold">
        User Dashboard
      </h1>

      <p className="mt-2 text-neutral-400">
        Welcome back
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">

        <p>
          Email: {user?.email || "N/A"}
        </p>

        <p className="mt-2">
          Role: {user?.role || "N/A"}
        </p>

      </div>

    </main>
  );
}