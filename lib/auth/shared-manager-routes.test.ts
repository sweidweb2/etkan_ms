import { describe, expect, it } from "vitest";
import {
  isSharedManagerCloudflareAiUsagePath,
  isSharedManagerInstructorsPath,
  isSharedManagerPath,
  isSharedManagerWorkshopPath,
} from "@/lib/auth/shared-manager-routes";
import { ROUTES } from "@/lib/constants/routes";

describe("shared manager routes", () => {
  it("matches workshops list, detail, and payments as workshop paths", () => {
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS)).toBe(true);
    expect(isSharedManagerWorkshopPath("/manager/workshops/abc-123")).toBe(
      true
    );
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS)).toBe(
      true
    );
    expect(
      isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES)
    ).toBe(false);
    expect(
      isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS)
    ).toBe(false);
  });

  it("matches manage instructors", () => {
    expect(isSharedManagerInstructorsPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(
      true
    );
    expect(isSharedManagerPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(true);
  });

  it("matches instructor schedules without requiring workshop instructor flag", () => {
    expect(isSharedManagerPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES)).toBe(
      true
    );
    expect(
      isSharedManagerPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES_DETAILS)
    ).toBe(true);
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

  it("matches income statement analytics without instructor flag", () => {
    expect(
      isSharedManagerPath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS)
    ).toBe(true);
    expect(isSharedManagerPath(ROUTES.MANAGER_INCOME_STATEMENT)).toBe(false);
  });

  it("matches academic analysis without instructor flag", () => {
    expect(isSharedManagerPath(ROUTES.MANAGER_ACADEMIC_ANALYSIS)).toBe(true);
  });

  it("matches guests and registration dossiers without instructor flag", () => {
    expect(isSharedManagerPath(ROUTES.MANAGER_GUESTS)).toBe(true);
    expect(isSharedManagerPath(`${ROUTES.MANAGER_GUESTS}/abc-123`)).toBe(true);
    expect(isSharedManagerPath(ROUTES.MANAGER_REGISTRATIONS)).toBe(true);
    expect(
      isSharedManagerPath(`${ROUTES.MANAGER_REGISTRATIONS}/abc-123`)
    ).toBe(true);
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_GUESTS)).toBe(false);
  });

  it("rejects other manager paths", () => {
    expect(isSharedManagerPath(ROUTES.MANAGER_USERS)).toBe(false);
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(false);
    expect(isSharedManagerPath(ROUTES.MANAGER_STUDENTS)).toBe(false);
  });
});
