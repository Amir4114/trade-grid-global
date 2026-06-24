import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-neutral-50 text-neutral-950 lg:grid-cols-2">
      <section className="hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between"><div className="text-xl font-semibold">Trade Grid Global</div><div><h1 className="text-5xl font-semibold tracking-tight">Access your trade workspace.</h1><p className="mt-4 text-neutral-300">Manage sourcing, RFQs, quotations, products, and verification.</p></div></section>
      <section className="flex items-center justify-center px-4 py-12">
        <form className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold">Login</h1>
          <p className="mt-2 text-sm text-neutral-600">Continue as buyer, supplier, or admin.</p>
          <div className="mt-6 space-y-4"><Input placeholder="Email" type="email" /><Input placeholder="Password" type="password" /></div>
          <Button className="mt-6 w-full" asChild><Link href="/dashboard/buyer">Login</Link></Button>
          <div className="mt-4 flex justify-between text-sm"><Link href="/forgot-password" className="text-neutral-600 hover:text-neutral-950">Forgot password?</Link><Link href="/signup" className="font-medium">Create account</Link></div>
        </form>
      </section>
    </main>
  );
}
