"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  dismissToast,
  subscribeToasts,
  type ToastRecord,
  type ToastVariant,
} from "@/lib/toast";
import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; className: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  error: {
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-900",
  },
  warning: {
    icon: AlertCircle,
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  info: {
    icon: Info,
    className: "border-neutral-200 bg-white text-neutral-900",
  },
  loading: {
    icon: Loader2,
    className: "border-neutral-200 bg-white text-neutral-900",
  },
};

function ToastItem({ toast }: { toast: ToastRecord }) {
  const config = VARIANT_STYLES[toast.variant];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg",
        config.className
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          toast.variant === "loading" && "animate-spin"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-sm opacity-80">{toast.description}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-current hover:bg-black/5"
        aria-label="Dismiss notification"
        onClick={() => dismissToast(toast.id)}
      >
        <X className="size-3.5" />
      </Button>
    </motion.div>
  );
}

export function ToastProvider() {
  const [items, setItems] = useState<ToastRecord[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <ToastItem key={item.id} toast={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
