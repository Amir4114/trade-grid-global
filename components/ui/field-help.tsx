"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

type FieldHelpProps = {
  label: string;
  description: string;
  example?: string;
  className?: string;
};

/**
 * Accessible inline help for technical trade terms. Shows on hover (desktop),
 * focus (keyboard), and tap (mobile).
 */
export function FieldHelp({
  label,
  description,
  example,
  className,
}: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={`${label} help`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full text-neutral-400 transition hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-xs leading-5 text-neutral-600 shadow-lg"
        >
          <span className="block">{description}</span>
          {example ? (
            <span className="mt-1 block text-neutral-500">
              Example: {example}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

type FieldLabelProps = {
  htmlFor?: string;
  children: ReactNode;
  help?: FieldHelpProps;
  className?: string;
};

export function FieldLabel({
  htmlFor,
  children,
  help,
  className,
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 flex items-center text-sm font-medium text-neutral-700",
        className
      )}
    >
      <span>{children}</span>
      {help ? <FieldHelp {...help} label={String(children)} /> : null}
    </label>
  );
}
