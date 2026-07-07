import type { BorrowEquipmentStatusValue } from "@/lib/constants/manager-borrow-equipment-status";

export const MANAGER_BORROW_EQUIPMENT_STATUS_LABELS: Record<
  BorrowEquipmentStatusValue,
  string
> = {
  borrowed: "Borrowed",
  returned: "Returned",
};

export const MANAGER_BORROW_EQUIPMENT_STATUS_BADGE_CLASSES: Record<
  BorrowEquipmentStatusValue,
  string
> = {
  borrowed: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20",
  returned: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
};

export const MANAGER_BORROW_EQUIPMENT_TOGGLE_LABELS = {
  borrowed: "Mark as returned",
  returned: "Mark as borrowed",
} as const;
