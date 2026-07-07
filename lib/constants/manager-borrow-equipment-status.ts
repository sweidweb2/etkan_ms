export const BORROW_EQUIPMENT_STATUSES = {
  BORROWED: "borrowed",
  RETURNED: "returned",
} as const;

export type BorrowEquipmentStatusValue =
  (typeof BORROW_EQUIPMENT_STATUSES)[keyof typeof BORROW_EQUIPMENT_STATUSES];

export const BORROW_EQUIPMENT_STATUS_VALUES = Object.values(
  BORROW_EQUIPMENT_STATUSES
);
