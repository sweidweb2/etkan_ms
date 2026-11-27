import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { saveKanbanBoardForManager } from "@/services/shared/kanban-board-mutations";
import type { AuditActor } from "@/services/ops/audit-log.service";
import * as authorization from "@/services/auth/authorization.service";

vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  getUnauthorizedError: vi.fn(),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const schema = z.object({
  columns: z.record(z.string(), z.array(z.string())),
});

describe("saveKanbanBoardForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorization.getUnauthorizedError).mockResolvedValue(null);
  });

  it("runs validatePlacements before treating empty placements as unchanged", async () => {
    const validatePlacements = vi.fn().mockResolvedValue({
      success: false as const,
      error: "Board is out of date. Refresh and try again.",
    });
    const updatePositions = vi.fn();

    const result = await saveKanbanBoardForManager({
      adminClient,
      actorUserId: actor.userId,
      actor,
      permission: PERMISSIONS.SEMESTERS_UPDATE,
      schema,
      input: { columns: { unassigned: [] } },
      unassignedId: "unassigned",
      buildPlacements: () => [],
      validatePlacements,
      updatePositions,
      getPlacementRecordId: () => null,
      tableName: "semesters",
      failMessage: "Unable to save board.",
      successMessage: "Board saved.",
      auditNote: "test",
      columnEntityNotFoundMessage: "Team not found.",
    });

    expect(validatePlacements).toHaveBeenCalledWith([]);
    expect(updatePositions).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "Board is out of date. Refresh and try again.",
    });
  });

  it("requires the configured permission", async () => {
    vi.mocked(authorization.getUnauthorizedError).mockResolvedValue(
      "Unauthorized."
    );

    const result = await saveKanbanBoardForManager({
      adminClient,
      actorUserId: null,
      actor,
      permission: PERMISSIONS.SEMESTERS_UPDATE,
      schema,
      input: { columns: {} },
      unassignedId: "unassigned",
      buildPlacements: () => [],
      updatePositions: vi.fn(),
      getPlacementRecordId: () => null,
      tableName: "semesters",
      failMessage: "Unable to save board.",
      successMessage: "Board saved.",
      auditNote: "test",
      columnEntityNotFoundMessage: "Team not found.",
    });

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(authorization.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.SEMESTERS_UPDATE
    );
  });
});
