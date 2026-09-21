import { describe, expect, it } from "vitest";
import { isManagerPanelPath } from "@/lib/auth/supervisor-manager-access";
import { ROUTES } from "@/lib/constants/routes";

describe("isManagerPanelPath", () => {
  it("matches manager root and nested routes", () => {
    expect(isManagerPanelPath(ROUTES.MANAGER_ROOT)).toBe(true);
    expect(isManagerPanelPath(ROUTES.MANAGER_STUDENTS)).toBe(true);
    expect(isManagerPanelPath(`${ROUTES.MANAGER_CLASSES}/abc`)).toBe(true);
  });

  it("rejects non-manager panels", () => {
    expect(isManagerPanelPath(ROUTES.SUPERVISOR_ROOT)).toBe(false);
    expect(isManagerPanelPath(ROUTES.TEACHER_ROOT)).toBe(false);
  });
});
