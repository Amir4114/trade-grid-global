import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/marketplace/SectionHeader";

export default function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <Navbar />
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/" className="hover:text-neutral-950">Home</Link>
            <ChevronRight className="size-4" />
            <span>{title}</span>
          </div>
          <SectionHeader eyebrow={eyebrow} title={title} description={description} />
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
      <Footer />
    </main>
  );
}
