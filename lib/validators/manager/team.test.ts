import { describe, expect, it } from "vitest";
import { TEAM_DEFAULT_STATUS } from "@/lib/constants/team";
import { parseAssignGuestToTeamFormData } from "@/lib/validators/manager/assign-guest-to-team";
import { parseCreateTeamFormData } from "@/lib/validators/manager/create-team";
import { parseUpdateTeamFormData } from "@/lib/validators/manager/update-team";

const sampleId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const otherId = "b1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("parseCreateTeamFormData", () => {
  it("parses a full team payload", () => {
    const formData = new FormData();
    formData.set("name", "Summer cohort A");
    formData.set("expected_start_date", "2026-09-01");
    formData.set("status", "started");

    const result = parseCreateTeamFormData(formData);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Summer cohort A",
        expected_start_date: "2026-09-01",
        status: "started",
      },
    });
  });

  it("treats a blank date as no expected start date and defaults the status", () => {
    const formData = new FormData();
    formData.set("name", "Cohort B");
    formData.set("expected_start_date", "");

    const result = parseCreateTeamFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expected_start_date).toBeNull();
      expect(result.data.status).toBe(TEAM_DEFAULT_STATUS);
    }
  });

  it("rejects a missing name", () => {
    const formData = new FormData();
    formData.set("name", "  ");

    const result = parseCreateTeamFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("rejects a malformed date", () => {
    const formData = new FormData();
    formData.set("name", "Cohort C");
    formData.set("expected_start_date", "01-09-2026");

    const result = parseCreateTeamFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.expected_start_date).toBeDefined();
    }
  });

  it("rejects an unknown status", () => {
    const formData = new FormData();
    formData.set("name", "Cohort D");
    formData.set("status", "paused");

    const result = parseCreateTeamFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.status).toBeDefined();
    }
  });
});

describe("parseUpdateTeamFormData", () => {
  it("parses a valid update payload", () => {
    const formData = new FormData();
    formData.set("id", sampleId);
    formData.set("name", "Renamed cohort");
    formData.set("expected_start_date", "2026-10-15");
    formData.set("status", "cancelled");

    const result = parseUpdateTeamFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(sampleId);
      expect(result.data.status).toBe("cancelled");
    }
  });

  it("rejects an invalid team id", () => {
    const formData = new FormData();
    formData.set("id", "not-a-uuid");
    formData.set("name", "Renamed cohort");

    const result = parseUpdateTeamFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.id).toBeDefined();
    }
  });
});

describe("parseAssignGuestToTeamFormData", () => {
  it("parses an assignment to a team", () => {
    const formData = new FormData();
    formData.set("guest_id", sampleId);
    formData.set("team_id", otherId);

    const result = parseAssignGuestToTeamFormData(formData);

    expect(result).toEqual({
      success: true,
      data: { guest_id: sampleId, team_id: otherId },
    });
  });

  it("treats a blank team id as a move back to the guests table", () => {
    const formData = new FormData();
    formData.set("guest_id", sampleId);
    formData.set("team_id", "");

    const result = parseAssignGuestToTeamFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.team_id).toBeNull();
    }
  });

  it("rejects an invalid guest id", () => {
    const formData = new FormData();
    formData.set("guest_id", "nope");
    formData.set("team_id", "");

    const result = parseAssignGuestToTeamFormData(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.guest_id).toBeDefined();
    }
  });
});
