import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import * as equipmentRepository from "@/repositories/equipment.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createBorrowsForManager,
  listAllBorrowsForManager,
  listEquipmentBorrowsForManager,
  toggleBorrowReturnedForManager,
  updateBorrowRecordForManager,
} from "@/services/borrow-equipment.service";

vi.mock("@/repositories/borrow-equipment.repository");
vi.mock("@/repositories/equipment.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));


vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};
const equipmentId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const userId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";

describe("listEquipmentBorrowsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listEquipmentBorrowsForManager(adminClient, null, equipmentId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped borrow rows with student names", async () => {
    vi.mocked(borrowEquipmentRepository.listBorrowsByEquipmentId).mockResolvedValue(
      {
        data: [
          {
            id: "borrow-1",
            equipment_id: equipmentId,
            user_id: userId,
            quantity: 2,
            borrowed_at: "2026-01-02T00:00:00.000Z",
            returned_at: null,
            status: BORROW_EQUIPMENT_STATUSES.BORROWED,
          },
        ],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }
    );
    vi.mocked(studentProfileRepository.listStudentProfilesByUserIds).mockResolvedValue(
      {
        data: [{ user_id: userId, full_name: "Student One" }],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }
    );

    const rows = await listEquipmentBorrowsForManager(
      adminClient,
      actor.userId,
      equipmentId
    );

    expect(rows).toEqual([
      {
        id: "borrow-1",
        equipment_id: equipmentId,
        user_id: userId,
        student_name: "Student One",
        quantity: 2,
        borrowed_at: "2026-01-02T00:00:00.000Z",
        returned_at: null,
        status: BORROW_EQUIPMENT_STATUSES.BORROWED,
      },
    ]);
  });

  it("returns an empty list when no borrows exist", async () => {
    vi.mocked(borrowEquipmentRepository.listBorrowsByEquipmentId).mockResolvedValue(
      {
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }
    );

    const rows = await listEquipmentBorrowsForManager(
      adminClient,
      actor.userId,
      equipmentId
    );

    expect(rows).toEqual([]);
  });
});

describe("listAllBorrowsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listAllBorrowsForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped borrow rows with student and equipment names", async () => {
    vi.mocked(borrowEquipmentRepository.listAllBorrows).mockResolvedValue({
      data: [
        {
          id: "borrow-1",
          equipment_id: equipmentId,
          user_id: userId,
          quantity: 2,
          borrowed_at: "2026-01-02T00:00:00.000Z",
          returned_at: null,
          status: BORROW_EQUIPMENT_STATUSES.BORROWED,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(studentProfileRepository.listStudentProfilesByUserIds).mockResolvedValue(
      {
        data: [{ user_id: userId, full_name: "Student One" }],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }
    );
    vi.mocked(equipmentRepository.listEquipmentsByIds).mockResolvedValue({
      data: [
        {
          id: equipmentId,
          name: "Microscope",
          description: "Lab microscope",
          unit_price: 250,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const rows = await listAllBorrowsForManager(adminClient, actor.userId);

    expect(rows).toEqual([
      {
        id: "borrow-1",
        equipment_id: equipmentId,
        user_id: userId,
        equipment_name: "Microscope",
        equipment_description: "Lab microscope",
        equipment_unit_price: 250,
        quantity: 2,
        borrowed_at: "2026-01-02T00:00:00.000Z",
        returned_at: null,
        status: BORROW_EQUIPMENT_STATUSES.BORROWED,
        student_name: "Student One",
      },
    ]);
  });
});

describe("createBorrowsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await createBorrowsForManager(adminClient, null, actor, {
      items: [
        {
          user_id: userId,
          equipment_id: equipmentId,
          quantity: 1,
        },
      ],
    });

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects when stock is insufficient for one student", async () => {
    vi.mocked(equipmentRepository.listEquipments).mockResolvedValue({
      data: [
        {
          id: equipmentId,
          name: "Microscope",
          description: null,
          quantity: 5,
          unit_price: 250,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds
    ).mockResolvedValue({
      data: [{ equipment_id: equipmentId, quantity: 4 }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createBorrowsForManager(adminClient, actor.userId, actor, {
      items: [
        {
          user_id: userId,
          equipment_id: equipmentId,
          quantity: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Not enough stock");
    }
    expect(borrowEquipmentRepository.createBorrows).not.toHaveBeenCalled();
  });

  it("rejects when total demand exceeds remaining for multiple students", async () => {
    const secondUserId = "22222222-2222-4222-8222-222222222222";
    const thirdUserId = "33333333-3333-4333-8333-333333333333";

    vi.mocked(equipmentRepository.listEquipments).mockResolvedValue({
      data: [
        {
          id: equipmentId,
          name: "Microscope",
          description: null,
          quantity: 10,
          unit_price: 250,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
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

    const result = await createBorrowsForManager(adminClient, actor.userId, actor, {
      items: [
        {
          user_id: userId,
          equipment_id: equipmentId,
          quantity: 2,
        },
        {
          user_id: secondUserId,
          equipment_id: equipmentId,
          quantity: 2,
        },
        {
          user_id: thirdUserId,
          equipment_id: equipmentId,
          quantity: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Not enough stock");
      expect(result.error).toContain("5 available, 6 requested");
    }
    expect(borrowEquipmentRepository.createBorrows).not.toHaveBeenCalled();
  });

  it("creates borrow records when stock is available", async () => {
    vi.mocked(equipmentRepository.listEquipments).mockResolvedValue({
      data: [
        {
          id: equipmentId,
          name: "Microscope",
          description: null,
          quantity: 10,
          unit_price: 250,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
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
    vi.mocked(borrowEquipmentRepository.createBorrows).mockResolvedValue({
      data: [
        {
          id: "borrow-new",
          equipment_id: equipmentId,
          user_id: userId,
          quantity: 1,
          borrowed_at: "2026-01-03T00:00:00.000Z",
          returned_at: null,
          status: BORROW_EQUIPMENT_STATUSES.BORROWED,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createBorrowsForManager(adminClient, actor.userId, actor, {
      items: [
        {
          user_id: userId,
          equipment_id: equipmentId,
          quantity: 1,
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      message: "1 borrow record saved.",
      createdCount: 1,
    });
    expect(borrowEquipmentRepository.createBorrows).toHaveBeenCalledWith(
      adminClient,
      [
        {
          equipment_id: equipmentId,
          user_id: userId,
          quantity: 1,
          status: BORROW_EQUIPMENT_STATUSES.BORROWED,
        },
      ]
    );
  });
});

describe("updateBorrowRecordForManager", () => {
  const borrowId = "11111111-1111-4111-8111-111111111111";

  const existingBorrow = {
    id: borrowId,
    equipment_id: equipmentId,
    user_id: userId,
    quantity: 2,
    borrowed_at: "2026-01-02T00:00:00.000Z",
    returned_at: null,
    status: BORROW_EQUIPMENT_STATUSES.BORROWED,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  const equipmentRecord = {
    id: equipmentId,
    name: "Microscope",
    description: null,
    quantity: 10,
    unit_price: 250,
    created_at: "2026-01-01T00:00:00.000Z",
  };

  function mockEquipmentLookup(activeBorrowedQuantity: number) {
    vi.mocked(equipmentRepository.findEquipmentById).mockResolvedValue({
      data: equipmentRecord,
      error: null,
    });
    vi.mocked(
      borrowEquipmentRepository.listActiveBorrowQuantitiesByEquipmentIds
    ).mockResolvedValue({
      data: [{ equipment_id: equipmentId, quantity: activeBorrowedQuantity }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
  }

  it("rejects when increasing quantity beyond available stock", async () => {
    vi.mocked(borrowEquipmentRepository.getBorrowById).mockResolvedValue({
      data: existingBorrow,
      error: null,
    });
    mockEquipmentLookup(9);

    const result = await updateBorrowRecordForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: borrowId,
        quantity: 4,
        status: BORROW_EQUIPMENT_STATUSES.BORROWED,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Maximum quantity is 3");
    }
    expect(borrowEquipmentRepository.updateBorrowRecord).not.toHaveBeenCalled();
  });

  it("updates borrow record when stock allows it", async () => {
    vi.mocked(borrowEquipmentRepository.getBorrowById).mockResolvedValue({
      data: existingBorrow,
      error: null,
    });
    mockEquipmentLookup(2);
    vi.mocked(borrowEquipmentRepository.updateBorrowRecord).mockResolvedValue({
      data: { ...existingBorrow, quantity: 4 },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateBorrowRecordForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: borrowId,
        quantity: 4,
        status: BORROW_EQUIPMENT_STATUSES.BORROWED,
      }
    );

    expect(result).toEqual({
      success: true,
      message: "Borrow record updated.",
    });
  });
});

describe("toggleBorrowReturnedForManager", () => {
  const borrowId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("marks a borrow as returned without stock validation", async () => {
    vi.mocked(borrowEquipmentRepository.getBorrowById).mockResolvedValue({
      data: {
        id: borrowId,
        equipment_id: equipmentId,
        user_id: userId,
        quantity: 2,
        borrowed_at: "2026-01-02T00:00:00.000Z",
        returned_at: null,
        status: BORROW_EQUIPMENT_STATUSES.BORROWED,
      },
      error: null,
    });
    vi.mocked(borrowEquipmentRepository.updateBorrowRecord).mockResolvedValue({
      data: {
        id: borrowId,
        equipment_id: equipmentId,
        user_id: userId,
        quantity: 2,
        borrowed_at: "2026-01-02T00:00:00.000Z",
        returned_at: "2026-01-04T00:00:00.000Z",
        status: BORROW_EQUIPMENT_STATUSES.RETURNED,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await toggleBorrowReturnedForManager(
      adminClient,
      actor.userId,
      actor,
      { id: borrowId, isReturned: true }
    );

    expect(result.success).toBe(true);
    expect(borrowEquipmentRepository.updateBorrowRecord).toHaveBeenCalledWith(
      adminClient,
      borrowId,
      expect.objectContaining({
        status: BORROW_EQUIPMENT_STATUSES.RETURNED,
      })
    );
  });

  it("rejects re-borrow when stock is unavailable", async () => {
    vi.mocked(borrowEquipmentRepository.getBorrowById).mockResolvedValue({
      data: {
        id: borrowId,
        equipment_id: equipmentId,
        user_id: userId,
        quantity: 3,
        borrowed_at: "2026-01-02T00:00:00.000Z",
        returned_at: "2026-01-04T00:00:00.000Z",
        status: BORROW_EQUIPMENT_STATUSES.RETURNED,
      },
      error: null,
    });
    vi.mocked(equipmentRepository.findEquipmentById).mockResolvedValue({
      data: {
        id: equipmentId,
        name: "Microscope",
        description: null,
        quantity: 5,
        unit_price: 250,
        created_at: "2026-01-01T00:00:00.000Z",
      },
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

    const result = await toggleBorrowReturnedForManager(
      adminClient,
      actor.userId,
      actor,
      { id: borrowId, isReturned: false }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Maximum quantity is 0");
    }
  });
});
