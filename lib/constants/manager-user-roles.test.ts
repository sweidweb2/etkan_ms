import { describe, expect, it } from "vitest";
import {
  MANAGER_CREATABLE_ROLE_LABELS,
  MANAGER_CREATABLE_ROLES,
} from "@/lib/constants/manager-user-roles";
import {
  MANAGER_USER_EDITABLE_ROLES,
  MANAGER_USER_ROLE_LABELS,
} from "@/lib/constants/manager-user-display";
import { ROLE_VALUES, ROLES } from "@/lib/constants/roles";

describe("manager user role options", () => {
  it("includes supervisor in create-user role options with a label", () => {
    expect(MANAGER_CREATABLE_ROLES).toContain(ROLES.SUPERVISOR);
    expect(MANAGER_CREATABLE_ROLE_LABELS[ROLES.SUPERVISOR]).toBe("Supervisor");
  });

  it("includes supervisor in edit/filter role options with a label", () => {
    expect(MANAGER_USER_EDITABLE_ROLES).toContain(ROLES.SUPERVISOR);
    expect(MANAGER_USER_ROLE_LABELS[ROLES.SUPERVISOR]).toBe("Supervisor");
    expect(ROLE_VALUES).toContain(ROLES.SUPERVISOR);
  });
});
