import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CEO_WORKSHOP_SEED_PERMISSIONS,
  ROLE_SEED_PERMISSIONS,
} from "@/lib/constants/role-seed-permissions";
import { ROLES } from "@/lib/constants/roles";

const CEO_GUEST_PERMISSIONS = [
  PERMISSIONS.GUESTS_VIEW,
  PERMISSIONS.GUESTS_CREATE,
  PERMISSIONS.GUESTS_UPDATE,
  PERMISSIONS.GUESTS_DELETE,
  PERMISSIONS.GUESTS_CHANGE_STATUS,
  PERMISSIONS.GUESTS_REGISTRATION_MANAGE,
  PERMISSIONS.GUESTS_CREATE_STUDENT,
] as const;

describe("role-seed-permissions guests", () => {
  it("seeds all guests.* permissions to CEO", () => {
    for (const key of CEO_GUEST_PERMISSIONS) {
      expect(CEO_WORKSHOP_SEED_PERMISSIONS).toContain(key);
    }

    const ceoSeed = ROLE_SEED_PERMISSIONS[ROLES.CEO];
    for (const key of CEO_GUEST_PERMISSIONS) {
      expect(ceoSeed).toContain(key);
    }
    expect(ceoSeed).toContain(PERMISSIONS.REGISTRATIONS_VIEW);
  });
});
