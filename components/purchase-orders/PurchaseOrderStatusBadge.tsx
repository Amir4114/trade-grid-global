import {
  buyerStatusLabel,
  statusBadgeClass,
  supplierStatusLabel,
} from "@/lib/purchase-orders/helpers";
import type { PurchaseOrderStatus } from "@/lib/database/types";
import { cn } from "@/lib/utils";

type Props = {
  status: PurchaseOrderStatus;
  role?: "buyer" | "supplier";
  className?: string;
};

export default function PurchaseOrderStatusBadge({
  status,
  role = "buyer",
  className,
}: Props) {
  const label =
    role === "supplier" ? supplierStatusLabel(status) : buyerStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        statusBadgeClass(status),
        className
      )}
    >
      {label}
    </span>
  );
}
