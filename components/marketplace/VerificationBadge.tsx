import { BadgeCheck, Clock3, ShieldAlert, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationLevel, VerificationState } from "@/lib/marketplace/types";

const levelToState: Record<VerificationLevel, VerificationState> = {
  basic: "pending",
  verified: "verified",
  premium: "gold-verified",
};

const config: Record<VerificationState, { label: string; className: string; icon: typeof BadgeCheck }> = {
  pending: { label: "Pending", className: "border-neutral-200 bg-neutral-100 text-neutral-700", icon: Clock3 },
  "under-review": { label: "Under Review", className: "border-neutral-300 bg-white text-neutral-950", icon: ShieldAlert },
  verified: { label: "Verified", className: "border-neutral-300 bg-white text-neutral-950", icon: ShieldCheck },
  rejected: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  "gold-verified": { label: "Gold Verified", className: "border-neutral-950 bg-neutral-950 text-white", icon: Sparkles },
};

export default function VerificationBadge({ level, state }: { level?: VerificationLevel; state?: VerificationState }) {
  const resolvedState = state ?? (level ? levelToState[level] : "pending");
  const item = config[resolvedState];
  const Icon = item.icon;

  return (
    <Badge variant="outline" className={`rounded-md ${item.className}`}>
      <Icon className="size-3" />
      {item.label}
    </Badge>
  );
}
