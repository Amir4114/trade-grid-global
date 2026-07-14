export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

export type ToastInput = {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastRecord = ToastInput & {
  id: string;
  variant: ToastVariant;
  createdAt: number;
};

type ToastListener = (toasts: ToastRecord[]) => void;

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;

let toasts: ToastRecord[] = [];
const listeners = new Set<ToastListener>();
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener([...toasts]));
}

function scheduleDismiss(id: string, duration: number) {
  const existing = dismissTimers.get(id);
  if (existing) {
    clearTimeout(existing);
  }

  if (duration <= 0) {
    return;
  }

  const timer = setTimeout(() => {
    dismissToast(id);
  }, duration);

  dismissTimers.set(id, timer);
}

function pushToast(input: ToastInput): string {
  const id =
    input.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const variant = input.variant ?? "info";
  const duration =
    input.duration ?? (variant === "loading" ? 0 : DEFAULT_DURATION);

  const record: ToastRecord = {
    ...input,
    id,
    variant,
    createdAt: Date.now(),
  };

  toasts = [record, ...toasts.filter((item) => item.id !== id)].slice(
    0,
    MAX_TOASTS
  );

  emit();
  scheduleDismiss(id, duration);

  return id;
}

export function dismissToast(id: string) {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }

  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) {
    return;
  }

  toasts = next;
  emit();
}

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  listener([...toasts]);

  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(title: string, options?: Omit<ToastInput, "title" | "variant">) {
    return pushToast({ title, variant: "success", ...options });
  },

  error(title: string, options?: Omit<ToastInput, "title" | "variant">) {
    return pushToast({ title, variant: "error", ...options });
  },

  warning(title: string, options?: Omit<ToastInput, "title" | "variant">) {
    return pushToast({ title, variant: "warning", ...options });
  },

  info(title: string, options?: Omit<ToastInput, "title" | "variant">) {
    return pushToast({ title, variant: "info", ...options });
  },

  loading(title: string, options?: Omit<ToastInput, "title" | "variant">) {
    return pushToast({ title, variant: "loading", duration: 0, ...options });
  },

  dismiss: dismissToast,
};
