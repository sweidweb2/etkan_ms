import {
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";

/**
 * Personal (UBAC) grants applied when `is_instructor` or `is_mentor` is turned on.
 * View-only: list + detail shell (and schedule section). Write keys stay role/overlay.
 */
export const WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS = [
  PERMISSIONS.WORKSHOPS_VIEW,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
] as const satisfies readonly PermissionKey[];

export type WorkshopAttributeAccessInput = {
  isInstructor?: boolean;
  isMentor?: boolean;
};

/** Shared Manage workshops UI requires instructor and/or mentor attribute. */
export function canAccessManageWorkshops(
  input: WorkshopAttributeAccessInput
): boolean {
  return input.isInstructor === true || input.isMentor === true;
}
