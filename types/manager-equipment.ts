export interface ManagerEquipmentRow {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  /** Preview aggregate from borrow_equipment until backend is connected. */
  borrowed_quantity: number;
}
