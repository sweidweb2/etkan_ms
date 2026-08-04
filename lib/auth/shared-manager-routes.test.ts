import { describe, expect, it } from "vitest";
import { isSharedManagerWorkshopPath } from "@/lib/auth/shared-manager-routes";
import { ROUTES } from "@/lib/constants/routes";

describe("isSharedManagerWorkshopPath", () => {
  it("matches workshops list, detail, and payments", () => {
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS)).toBe(true);
    expect(isSharedManagerWorkshopPath("/manager/workshops/abc-123")).toBe(
      true
    );
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS)).toBe(
      true
    );
  });

  it("rejects other manager paths", () => {
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_USERS)).toBe(false);
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_INSTRUCTORS)).toBe(false);
    expect(isSharedManagerWorkshopPath(ROUTES.MANAGER_DASHBOARD)).toBe(false);
  });
});
