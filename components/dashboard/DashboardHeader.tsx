import { Badge } from "@/components/ui/badge";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
};

export default function DashboardHeader({
  title,
  description,
  badge,
  actions,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Dashboard
          </p>
          {badge ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-700"
            >
              {badge}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
