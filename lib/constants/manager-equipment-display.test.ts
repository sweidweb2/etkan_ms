import { describe, expect, it } from "vitest";
import {
  BORROW_EQUIPMENT_STATUSES,
  type BorrowEquipmentStatusValue,
} from "@/lib/constants/manager-borrow-equipment-status";
import {
  exceedsEquipmentRemainingStock,
  getBorrowDemandTotal,
  getMaxBorrowQuantityPerStudent,
  getMaxEditableBorrowQuantity,
} from "@/lib/constants/manager-equipment-display";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const equipment: ManagerEquipmentRow = {
  id: "equipment-1",
  name: "Microscope",
  description: null,
  quantity: 10,
  unit_price: 100,
  created_at: "2026-01-01T00:00:00.000Z",
  borrowed_quantity: 4,
};

describe("borrow stock helpers", () => {
  it("calculates total demand from students and per-student quantity", () => {
    expect(getBorrowDemandTotal(3, 2)).toBe(6);
  });

  it("detects when total demand exceeds remaining stock", () => {
    expect(exceedsEquipmentRemainingStock(equipment, 3, 3)).toBe(true);
    expect(exceedsEquipmentRemainingStock(equipment, 2, 3)).toBe(false);
  });

  it("returns max borrow quantity per student from remaining stock", () => {
    expect(getMaxBorrowQuantityPerStudent(equipment, 3)).toBe(2);
    expect(getMaxBorrowQuantityPerStudent(equipment, 7)).toBe(0);
  });

  it("returns max editable quantity for an existing borrowed row", () => {
    const borrowedRow = {
      quantity: 2,
      status: BORROW_EQUIPMENT_STATUSES.BORROWED as BorrowEquipmentStatusValue,
    };

    expect(
      getMaxEditableBorrowQuantity(
        equipment,
        borrowedRow,
        BORROW_EQUIPMENT_STATUSES.BORROWED
      )
    ).toBe(8);

    expect(
      getMaxEditableBorrowQuantity(
        equipment,
        borrowedRow,
        BORROW_EQUIPMENT_STATUSES.RETURNED
      )
    ).toBe(999);
  });
});
