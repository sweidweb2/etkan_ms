import { describe, expect, it } from "vitest";
import {
  isSharedManagerCloudflareAiUsagePath,
  isSharedManagerInstructorsPath,
  isSharedManagerPath,
  isSharedManagerWorkshopPath,
} from "@/lib/auth/shared-manager-routes";
import { ROUTES } from "@/lib/constants/routes";

describe("shared manager routes", () => {
  it("matches workshops list, detail, payments, and instructor schedules", () => {
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS)).toBe(true);
    expect(isSharedManagerWorkshopPath("/manager/workshops/abc-123")).toBe(
      true
    );
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS)).toBe(
      true
    );
    expect(
      isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES)
    ).toBe(true);
    expect(
      isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS)
    ).toBe(true);
  });

  it("matches manage instructors", () => {
    expect(isSharedManagerInstructorsPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(
      true
    );
    expect(isSharedManagerPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(true);
  });

  it("matches cloudflare AI usage", () => {
    expect(
      isSharedManagerCloudflareAiUsagePath(ROUTES.MANAGER_CLOUDFLARE_AI_USAGE)
    ).toBe(true);
    expect(isSharedManagerPath(ROUTES.MANAGER_CLOUDFLARE_AI_USAGE)).toBe(true);
    expect(
      isSharedManagerWorkshopPath(ROUTES.MANAGER_CLOUDFLARE_AI_USAGE)
    ).toBe(false);
  });

  it("rejects other manager paths", () => {
    expect(isSharedManagerPath(ROUTES.MANAGER_USERS)).toBe(false);
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(false);
    expect(isSharedManagerPath(ROUTES.MANAGER_DASHBOARD)).toBe(false);
  });
});