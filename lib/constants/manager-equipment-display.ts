import {
  BORROW_EQUIPMENT_STATUSES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatEquipmentUnitPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function getEquipmentRemainingQuantity(equipment: ManagerEquipmentRow): number {
  return Math.max(0, equipment.quantity - equipment.borrowed_quantity);
}

export function getBorrowDemandTotal(
  studentCount: number,
  quantityPerStudent: number
): number {
  return studentCount * quantityPerStudent;
}

export function exceedsEquipmentRemainingStock(
  equipment: ManagerEquipmentRow,
  studentCount: number,
  quantityPerStudent: number
): boolean {
  if (studentCount <= 0 || quantityPerStudent <= 0) {
    return true;
  }

  return (
    getBorrowDemandTotal(studentCount, quantityPerStudent) >
    getEquipmentRemainingQuantity(equipment)
  );
}

export function getMaxBorrowQuantityPerStudent(
  equipment: ManagerEquipmentRow,
  studentCount: number
): number {
  if (studentCount <= 0) {
    return 0;
  }

  return Math.floor(
    getEquipmentRemainingQuantity(equipment) / studentCount
  );
}

export function getMaxEditableBorrowQuantity(
  equipment: ManagerEquipmentRow,
  row: { quantity: number; status: BorrowEquipmentStatusValue },
  nextStatus: BorrowEquipmentStatusValue
): number {
  if (nextStatus === BORROW_EQUIPMENT_STATUSES.RETURNED) {
    return 999;
  }

  const remaining = getEquipmentRemainingQuantity(equipment);
  const currentContribution =
    row.status === BORROW_EQUIPMENT_STATUSES.BORROWED ? row.quantity : 0;

  return Math.max(0, remaining + currentContribution);
}

export function getEquipmentInventoryValue(equipment: ManagerEquipmentRow): number {
  return equipment.quantity * equipment.unit_price;
}
