import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950">
      <form className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">Create your marketplace account</h1>
        <p className="mt-2 text-sm text-neutral-600">Choose how you trade on Trade Grid Global.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="rounded-lg border border-neutral-200 p-4"><input name="accountType" type="radio" className="mr-2" defaultChecked />Importer / Buyer<p className="mt-2 text-sm text-neutral-600">Search suppliers, post RFQs, and manage quotations.</p></label>
          <label className="rounded-lg border border-neutral-200 p-4"><input name="accountType" type="radio" className="mr-2" />Exporter / Supplier<p className="mt-2 text-sm text-neutral-600">Create profile, list products, and respond to RFQs.</p></label>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><Input placeholder="Full name" /><Input placeholder="Business email" type="email" /><Input placeholder="Company name" /><Input placeholder="Password" type="password" /></div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button asChild><Link href="/onboarding/buyer">Continue as Buyer</Link></Button><Button asChild variant="outline"><Link href="/onboarding/supplier">Continue as Supplier</Link></Button></div>
        <p className="mt-4 text-sm text-neutral-600">Already have an account? <Link href="/login" className="font-medium text-neutral-950">Login</Link></p>
      </form>
    </main>
  );
}
