import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactPage() {
  return (
    <PageShell eyebrow="Contact" title="Talk to Trade Grid Global" description="Use this frontend form as the future entry point for sales, support, supplier verification, and buyer assistance.">
      <form className="max-w-2xl space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <Input placeholder="Name" />
        <Input placeholder="Business email" type="email" />
        <Input placeholder="Company" />
        <textarea className="min-h-32 w-full rounded-lg border border-neutral-300 p-3 text-sm" placeholder="How can we help?" />
        <Button>Send Message</Button>
      </form>
    </PageShell>
  );
}
