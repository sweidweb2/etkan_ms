import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import type { ManagerStudentBorrowEquipmentRow } from "@/types/manager-student-borrow-equipment";

const SARA_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const DEFAULT_BORROWS: ManagerStudentBorrowEquipmentRow[] = [
  {
    id: "be-default-1",
    equipment_id: "eq-laptop-01",
    user_id: "preview-user",
    equipment_name: "Student laptop",
    equipment_description: "14-inch classroom laptop",
    equipment_unit_price: 450,
    quantity: 1,
    borrowed_at: "2025-10-01T09:00:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  },
  {
    id: "be-default-2",
    equipment_id: "eq-calc-01",
    user_id: "preview-user",
    equipment_name: "Scientific calculator",
    equipment_description: "TI-84 equivalent",
    equipment_unit_price: 85,
    quantity: 1,
    borrowed_at: "2025-09-15T11:30:00.000Z",
    returned_at: "2025-11-20T15:00:00.000Z",
    status: BORROW_EQUIPMENT_STATUSES.RETURNED,
  },
];

const SARA_BORROWS: ManagerStudentBorrowEquipmentRow[] = [
  {
    id: "be-sara-1",
    equipment_id: "eq-laptop-01",
    user_id: SARA_USER_ID,
    equipment_name: "Student laptop",
    equipment_description: "14-inch classroom laptop with charger",
    equipment_unit_price: 450,
    quantity: 1,
    borrowed_at: "2025-09-14T08:15:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  },
  {
    id: "be-sara-2",
    equipment_id: "eq-calc-01",
    user_id: SARA_USER_ID,
    equipment_name: "Scientific calculator",
    equipment_description: "TI-84 equivalent for advanced math",
    equipment_unit_price: 85,
    quantity: 1,
    borrowed_at: "2025-09-12T10:00:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  },
  {
    id: "be-sara-3",
    equipment_id: "eq-microscope-01",
    user_id: SARA_USER_ID,
    equipment_name: "Lab microscope",
    equipment_description: "Biology lab compound microscope",
    equipment_unit_price: 320,
    quantity: 1,
    borrowed_at: "2025-10-05T13:20:00.000Z",
    returned_at: "2025-10-28T16:45:00.000Z",
    status: BORROW_EQUIPMENT_STATUSES.RETURNED,
  },
  {
    id: "be-sara-4",
    equipment_id: "eq-tablet-01",
    user_id: SARA_USER_ID,
    equipment_name: "Drawing tablet",
    equipment_description: "Wacom-style tablet for studio art",
    equipment_unit_price: 180,
    quantity: 1,
    borrowed_at: "2025-11-01T09:30:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  },
  {
    id: "be-sara-5",
    equipment_id: "eq-projector-01",
    user_id: SARA_USER_ID,
    equipment_name: "Portable projector",
    equipment_description: "HDMI mini projector for presentations",
    equipment_unit_price: 275,
    quantity: 1,
    borrowed_at: "2025-10-18T14:00:00.000Z",
    returned_at: "2025-10-25T11:00:00.000Z",
    status: BORROW_EQUIPMENT_STATUSES.RETURNED,
  },
  {
    id: "be-sara-6",
    equipment_id: "eq-headset-01",
    user_id: SARA_USER_ID,
    equipment_name: "Language lab headset",
    equipment_description: "USB headset with microphone",
    equipment_unit_price: 45,
    quantity: 2,
    borrowed_at: "2025-09-20T08:45:00.000Z",
    returned_at: "2025-12-01T12:00:00.000Z",
    status: BORROW_EQUIPMENT_STATUSES.RETURNED,
  },
  {
    id: "be-sara-7",
    equipment_id: "eq-camera-01",
    user_id: SARA_USER_ID,
    equipment_name: "DSLR camera kit",
    equipment_description: "School media club camera with lens",
    equipment_unit_price: 620,
    quantity: 1,
    borrowed_at: "2025-11-12T15:30:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  },
  {
    id: "be-sara-8",
    equipment_id: "eq-sensor-01",
    user_id: SARA_USER_ID,
    equipment_name: "Physics sensor kit",
    equipment_description: "Motion and temperature sensor pack",
    equipment_unit_price: 150,
    quantity: 1,
    borrowed_at: "2025-10-30T10:15:00.000Z",
    returned_at: "2025-11-15T09:00:00.000Z",
    status: BORROW_EQUIPMENT_STATUSES.RETURNED,
  },
];

/** Preview borrow rows keyed by profiles.user_id. */
export const MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK: Record<
  string,
  ManagerStudentBorrowEquipmentRow[]
> = {
  [SARA_USER_ID]: SARA_BORROWS,
};

export function getDefaultStudentBorrowEquipmentPreview(): ManagerStudentBorrowEquipmentRow[] {
  return DEFAULT_BORROWS.map((row) => ({ ...row }));
}
