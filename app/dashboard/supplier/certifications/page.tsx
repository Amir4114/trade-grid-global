import Link from "next/link";

import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";

const certifications = [
  "ISO 22000",
  "HACCP",
  "Halal Certification",
  "Organic EU",
  "FDA Registration",
  "BRC Food Safety",
];

export default function SupplierCertificationsPage() {
  return (
    <DashboardShell
      role="supplier"
      title="Certifications"
      description="Maintain compliance documents that buyers rely on for trust."
      actions={
        <Button asChild size="sm">
          <Link href="/onboarding/verification">Upload documents</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {certifications.map((cert) => (
          <DashboardPanel key={cert}>
            <h3 className="text-base font-semibold text-neutral-950">{cert}</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Status: Verified · Expires Dec 2026
            </p>
          </DashboardPanel>
        ))}
      </div>
    </DashboardShell>
  );
}
