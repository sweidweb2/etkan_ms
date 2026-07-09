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

export function getEquipmentInventoryValue(equipment: ManagerEquipmentRow): number {
  return equipment.quantity * equipment.unit_price;
}
