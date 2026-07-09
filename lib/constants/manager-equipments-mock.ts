import { getEquipmentBorrowedQuantityPreview } from "@/lib/manager/get-equipment-borrowed-quantity-preview";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const EQUIPMENT_SEED: Omit<ManagerEquipmentRow, "borrowed_quantity">[] = [
  {
    id: "eq-laptop-01",
    name: "Student laptop",
    description: "14-inch classroom laptop with charger",
    quantity: 24,
    unit_price: 450,
    created_at: "2025-08-01T10:00:00.000Z",
  },
  {
    id: "eq-calc-01",
    name: "Scientific calculator",
    description: "TI-84 equivalent for advanced math",
    quantity: 42,
    unit_price: 85,
    created_at: "2025-08-01T10:05:00.000Z",
  },
  {
    id: "eq-microscope-01",
    name: "Lab microscope",
    description: "Biology lab compound microscope",
    quantity: 8,
    unit_price: 320,
    created_at: "2025-08-02T09:30:00.000Z",
  },
  {
    id: "eq-tablet-01",
    name: "Drawing tablet",
    description: "Wacom-style tablet for studio art",
    quantity: 12,
    unit_price: 180,
    created_at: "2025-08-03T11:15:00.000Z",
  },
  {
    id: "eq-projector-01",
    name: "Portable projector",
    description: "HDMI mini projector for presentations",
    quantity: 6,
    unit_price: 275,
    created_at: "2025-08-04T08:45:00.000Z",
  },
  {
    id: "eq-headset-01",
    name: "Language lab headset",
    description: "USB headset with microphone",
    quantity: 30,
    unit_price: 45,
    created_at: "2025-08-05T13:20:00.000Z",
  },
  {
    id: "eq-camera-01",
    name: "DSLR camera kit",
    description: "School media club camera with lens",
    quantity: 4,
    unit_price: 620,
    created_at: "2025-08-06T15:00:00.000Z",
  },
  {
    id: "eq-sensor-01",
    name: "Physics sensor kit",
    description: "Motion and temperature sensor pack",
    quantity: 15,
    unit_price: 150,
    created_at: "2025-08-07T09:10:00.000Z",
  },
  {
    id: "eq-goggles-01",
    name: "Safety goggles",
    description: "Chemistry lab protective eyewear",
    quantity: 3,
    unit_price: 12,
    created_at: "2025-08-08T10:30:00.000Z",
  },
  {
    id: "eq-graph-calc-01",
    name: "Graphing calculator",
    description: "Classroom graphing calculator",
    quantity: 4,
    unit_price: 95,
    created_at: "2025-08-09T12:00:00.000Z",
  },
];

export const MANAGER_EQUIPMENTS_MOCK: ManagerEquipmentRow[] = EQUIPMENT_SEED.map(
  (equipment) => ({
    ...equipment,
    borrowed_quantity: getEquipmentBorrowedQuantityPreview(equipment.id),
  })
);
