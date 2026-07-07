import { z } from "zod";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";

export const updateBorrowEquipmentSchema = z.object({
  quantity: z
    .number({ message: "Quantity is required." })
    .int({ message: "Quantity must be a whole number." })
    .min(1, { message: "Quantity must be at least 1." })
    .max(999, { message: "Quantity must be at most 999." }),
  status: z.enum([
    BORROW_EQUIPMENT_STATUSES.BORROWED,
    BORROW_EQUIPMENT_STATUSES.RETURNED,
  ]),
  returnedAt: z.string().optional(),
});

export type UpdateBorrowEquipmentInput = z.infer<typeof updateBorrowEquipmentSchema>;
