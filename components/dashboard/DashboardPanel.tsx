import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export default function DashboardPanel({
  title,
  description,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      {title ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
