import { describe, expect, it } from "vitest";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import {
  changeWorkshopStatusSchema,
  parseChangeWorkshopStatusFormData,
} from "@/lib/validators/manager/change-workshop-status";

const workshopId = "11111111-1111-4111-8111-111111111111";

describe("changeWorkshopStatusSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = changeWorkshopStatusSchema.safeParse({
      id: workshopId,
      status: WORKSHOP_STATUSES.PROPOSAL,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid id and status", () => {
    expect(
      changeWorkshopStatusSchema.safeParse({
        id: "bad",
        status: WORKSHOP_STATUSES.PROPOSAL,
      }).success
    ).toBe(false);
    expect(
      changeWorkshopStatusSchema.safeParse({
        id: workshopId,
        status: "nope",
      }).success
    ).toBe(false);
  });
});

describe("parseChangeWorkshopStatusFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("id", workshopId);
    formData.set("status", WORKSHOP_STATUSES.SCHEDULED);

    const parsed = parseChangeWorkshopStatusFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe(WORKSHOP_STATUSES.SCHEDULED);
    }
  });
});
