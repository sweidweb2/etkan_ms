import { describe, expect, it } from "vitest";
import {
  isManagerPanelPath,
  isSupervisorForbiddenManagerPath,
  SUPERVISOR_FORBIDDEN_MANAGER_PREFIXES,
} from "@/lib/auth/supervisor-manager-access";
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

describe("isSupervisorForbiddenManagerPath", () => {
  it("blocks every configured forbidden prefix and nested URLs", () => {
    for (const prefix of SUPERVISOR_FORBIDDEN_MANAGER_PREFIXES) {
      expect(isSupervisorForbiddenManagerPath(prefix)).toBe(true);
      expect(isSupervisorForbiddenManagerPath(`${prefix}/nested`)).toBe(true);
    }
  });

  it("allows operational manager paths supervisors may use", () => {
    expect(isSupervisorForbiddenManagerPath(ROUTES.MANAGER_STUDENTS)).toBe(
      false
    );
    expect(isSupervisorForbiddenManagerPath(ROUTES.MANAGER_CLASSES)).toBe(
      false
    );
    expect(isSupervisorForbiddenManagerPath(ROUTES.MANAGER_WORKSHOPS)).toBe(
      false
    );
    expect(isSupervisorForbiddenManagerPath(ROUTES.MANAGER_GUESTS)).toBe(
      false
    );
    expect(
      isSupervisorForbiddenManagerPath(ROUTES.MANAGER_CLOUDFLARE_AI_USAGE)
    ).toBe(false);
  });
});
