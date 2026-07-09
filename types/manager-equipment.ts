import type { FieldErrors } from "@/types/auth";

export interface ManagerEquipmentRow {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  /** Aggregate from active borrow_equipment rows. */
  borrowed_quantity: number;
}

export type CreateEquipmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  equipment?: ManagerEquipmentRow;
};

export type UpdateEquipmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  equipment?: ManagerEquipmentRow;
};
