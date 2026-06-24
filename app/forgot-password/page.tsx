import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <form className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-neutral-600">Enter your email to receive password recovery instructions.</p>
        <Input className="mt-6" placeholder="Business email" type="email" />
        <Button className="mt-6 w-full">Send Reset Link</Button>
        <Button asChild variant="outline" className="mt-3 w-full"><Link href="/login">Back to Login</Link></Button>
      </form>
    </main>
  );
}
