import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  accent?: boolean;
};

export default function StatCard({
  label,
  value,
  detail,
  accent = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        accent && "border-t-2 border-t-amber-500"
      )}
    >
      <CardContent className="p-5">
        <div className="text-sm font-medium text-neutral-500">
          {label}
        </div>

        <div
          className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950"
          aria-label={label}
        >
          {value}
        </div>

        {detail && (
          <div className="mt-2 text-sm text-neutral-500">
            {detail}
          </div>
        )}
      </CardContent>
    </Card>
  );
}