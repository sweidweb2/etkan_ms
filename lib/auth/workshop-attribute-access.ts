import { ROLES, type RoleValue } from "@/lib/constants/roles";

/** Roles that manage workshops by permission alone (no instructor attribute). */
const WORKSHOP_ACCESS_BY_ROLE = new Set<RoleValue>([
  ROLES.MANAGER,
  ROLES.SUPERVISOR,
]);

export type WorkshopAttributeAccessInput = {
  isInstructor?: boolean;
  role?: RoleValue | null;
};

/**
 * Manage workshops UI: instructors via profile flag; managers/supervisors via role.
 * Callers still gate on `workshops.view` separately.
 */
export function canAccessManageWorkshops(
  input: WorkshopAttributeAccessInput
): boolean {
  if (input.role && WORKSHOP_ACCESS_BY_ROLE.has(input.role)) {
    return true;
  }
  return input.isInstructor === true;
}
