import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import * as equipmentRepository from "@/repositories/equipment.repository";
import {
  createEquipmentForManager,
  getEquipmentForManager,
  listEquipmentsForManager,
  updateEquipmentForManager,
} from "@/services/equipment.service";

vi.mock("@/repositories/equipment.repository");
vi.mock("@/repositories/borrow-equipment.repository");

const adminClient = {} as never;
const equipmentId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const equipmentRecord = {
  id: equipmentId,
  name: "Microscope",
  description: "Lab microscope",
  quantity: 10,
  unit_price: 250,
  created_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Microscope",
  description: "Lab microscope",
  quantity: 10,
  unit_price: 250,
};

describe("listEquipmentsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listEquipmentsForManager(adminClient, ROLES.TEACHER)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped equipment with borrowed quantities", async () => {
    vi.mocked(equipmentRepository.listEquipments).mockResolvedValue({
      data: [equipmentRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds
    ).mockResolvedValue({
      data: [{ equipment_id: equipmentId, quantity: 3 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const rows = await listEquipmentsForManager(adminClient, ROLES.MANAGER);

    expect(rows).toEqual([
      {
        id: equipmentId,
        name: "Microscope",
        description: "Lab microscope",
        quantity: 10,
        unit_price: 250,
        created_at: "2026-01-01T00:00:00.000Z",
        borrowed_quantity: 3,
      },
    ]);
  });
});

describe("getEquipmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when equipment is missing", async () => {
    vi.mocked(equipmentRepository.findEquipmentById).mockResolvedValue({
      data: null,
      error: null,
    });

    const row = await getEquipmentForManager(
      adminClient,
      ROLES.MANAGER,
      equipmentId
    );

    expect(row).toBeNull();
  });
});

describe("createEquipmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await createEquipmentForManager(
      adminClient,
      ROLES.TEACHER,
      validCreateInput
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates equipment when valid", async () => {
    vi.mocked(equipmentRepository.createEquipment).mockResolvedValue({
      data: equipmentRecord,
      error: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createEquipmentForManager(
      adminClient,
      ROLES.MANAGER,
      validCreateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.equipment.name).toBe("Microscope");
      expect(result.message).toBe("Equipment created.");
    }
  });
});

describe("updateEquipmentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects quantity below borrowed count", async () => {
    vi.mocked(equipmentRepository.findEquipmentById).mockResolvedValue({
      data: equipmentRecord,
      error: null,
    });
    vi.mocked(
      borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds
    ).mockResolvedValue({
      data: [{ equipment_id: equipmentId, quantity: 5 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateEquipmentForManager(adminClient, ROLES.MANAGER, {
      id: equipmentId,
      ...validCreateInput,
      quantity: 2,
    });

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        quantity: ["Quantity cannot be less than currently borrowed (5)."],
      },
    });
  });

  it("updates equipment when valid", async () => {
    vi.mocked(equipmentRepository.findEquipmentById).mockResolvedValue({
      data: equipmentRecord,
      error: null,
    });
    vi.mocked(
      borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds
    ).mockResolvedValue({
      data: [{ equipment_id: equipmentId, quantity: 2 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(equipmentRepository.updateEquipment).mockResolvedValue({
      data: { ...equipmentRecord, name: "Updated Microscope" },
      error: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateEquipmentForManager(adminClient, ROLES.MANAGER, {
      id: equipmentId,
      ...validCreateInput,
      name: "Updated Microscope",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.equipment.name).toBe("Updated Microscope");
      expect(result.equipment.borrowed_quantity).toBe(2);
      expect(result.message).toBe("Equipment updated.");
    }
  });
});
