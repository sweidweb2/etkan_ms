import { cn } from "@/lib/utils";
import {
  MANAGER_BORROW_EQUIPMENT_STATUS_BADGE_CLASSES,
  MANAGER_BORROW_EQUIPMENT_STATUS_LABELS,
} from "@/lib/constants/manager-student-borrow-equipment-display";
import type { BorrowEquipmentStatusValue } from "@/lib/constants/manager-borrow-equipment-status";

type BorrowEquipmentStatusBadgeProps = {
  status: BorrowEquipmentStatusValue;
  className?: string;
};

export function BorrowEquipmentStatusBadge({
  status,
  className,
}: BorrowEquipmentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        MANAGER_BORROW_EQUIPMENT_STATUS_BADGE_CLASSES[status],
        className
      )}
    >
      {MANAGER_BORROW_EQUIPMENT_STATUS_LABELS[status]}
    </span>
  );
}
