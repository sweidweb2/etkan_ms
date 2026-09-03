import { describe, expect, it, vi, beforeEach } from "vitest";
import * as guestRepository from "@/repositories/guest.repository";
import * as teamRepository from "@/repositories/team.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { recordManagerAuditLog } from "@/services/ops/audit-log.service";
import {
  assignGuestToTeamForManager,
  isClosedGuestStatus,
  releaseGuestFromTeamIfBecameClosed,
} from "@/services/teams/team.service";

vi.mock("@/repositories/guest.repository");
vi.mock("@/repositories/team.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
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

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const teamId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

const guestRecord = {
  id: guestId,
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3",
  interested_service: "etkan_roadmap",
  status: "scheduled",
  notes: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const teamRecord = {
  id: teamId,
  name: "Cohort A",
  expected_start_date: null,
  status: "scheduled",
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("isClosedGuestStatus", () => {
  it("treats cancelled, rejected, and finished as closed", () => {
    expect(isClosedGuestStatus("cancelled")).toBe(true);
    expect(isClosedGuestStatus("rejected")).toBe(true);
    expect(isClosedGuestStatus("finished")).toBe(true);
    expect(isClosedGuestStatus("scheduled")).toBe(false);
    expect(isClosedGuestStatus("pending")).toBe(false);
  });
});

describe("assignGuestToTeamForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await assignGuestToTeamForManager(
      adminClient,
      null,
      actor,
      { guest_id: guestId, team_id: teamId }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it.each(["cancelled", "rejected", "finished"] as const)(
    "allows assigning a %s guest to a team",
    async (status) => {
      vi.mocked(guestRepository.findGuestById).mockResolvedValue({
        data: { ...guestRecord, status },
        ...okResult,
      });
      vi.mocked(teamRepository.findTeamById).mockResolvedValue({
        data: teamRecord,
        ...okResult,
      });
      vi.mocked(teamRepository.assignGuestToTeam).mockResolvedValue({
        data: {
          id: "membership-1",
          team_id: teamId,
          guest_id: guestId,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        ...okResult,
      });

      const result = await assignGuestToTeamForManager(
        adminClient,
        actor.userId,
        actor,
        { guest_id: guestId, team_id: teamId }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.teamId).toBe(teamId);
        expect(result.guestId).toBe(guestId);
      }
      expect(teamRepository.assignGuestToTeam).toHaveBeenCalledWith(
        adminClient,
        {
          teamId,
          guestId,
          createdBy: actor.userId,
        }
      );
    }
  );
});

describe("releaseGuestFromTeamIfBecameClosed", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ["pending", "cancelled"],
    ["scheduled", "rejected"],
    ["pending", "finished"],
  ] as const)(
    "removes the guest from their team on %s → %s",
    async (previousStatus, nextStatus) => {
      vi.mocked(teamRepository.findTeamGuestByGuestId).mockResolvedValue({
        data: {
          id: "membership-1",
          team_id: teamId,
          guest_id: guestId,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        ...okResult,
      });
      vi.mocked(teamRepository.removeGuestFromTeam).mockResolvedValue({
        data: null,
        ...okResult,
      });

      await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
        guestId,
        previousStatus,
        nextStatus,
        guestName: "Ada Lovelace",
      });

      expect(teamRepository.removeGuestFromTeam).toHaveBeenCalledWith(
        adminClient,
        guestId
      );
      expect(recordManagerAuditLog).toHaveBeenCalledWith(
        adminClient,
        actor,
        expect.objectContaining({
          action: "delete",
          table_name: "team_guests",
          record_id: guestId,
        })
      );
    }
  );

  it("does not remove when the guest was already closed", async () => {
    await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
      guestId,
      previousStatus: "finished",
      nextStatus: "cancelled",
      guestName: "Ada Lovelace",
    });

    expect(teamRepository.findTeamGuestByGuestId).not.toHaveBeenCalled();
    expect(teamRepository.removeGuestFromTeam).not.toHaveBeenCalled();
  });

  it("does not remove on open → open transitions", async () => {
    await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
      guestId,
      previousStatus: "scheduled",
      nextStatus: "pending",
      guestName: "Ada Lovelace",
    });

    expect(teamRepository.findTeamGuestByGuestId).not.toHaveBeenCalled();
    expect(teamRepository.removeGuestFromTeam).not.toHaveBeenCalled();
  });

  it("does not remove when the guest is not on a team", async () => {
    vi.mocked(teamRepository.findTeamGuestByGuestId).mockResolvedValue({
      data: null,
      ...okResult,
    });

    await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
      guestId,
      previousStatus: "pending",
      nextStatus: "cancelled",
      guestName: "Ada Lovelace",
    });

    expect(teamRepository.removeGuestFromTeam).not.toHaveBeenCalled();
    expect(recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("does not auto-rejoin on closed → open", async () => {
    await releaseGuestFromTeamIfBecameClosed(adminClient, actor, {
      guestId,
      previousStatus: "finished",
      nextStatus: "pending",
      guestName: "Ada Lovelace",
    });

    expect(teamRepository.findTeamGuestByGuestId).not.toHaveBeenCalled();
    expect(teamRepository.assignGuestToTeam).not.toHaveBeenCalled();
  });
});
