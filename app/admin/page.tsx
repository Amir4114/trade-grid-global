"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/admin");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
      <p className="text-sm text-neutral-400">Redirecting to admin dashboard...</p>
    </main>
  );
}
