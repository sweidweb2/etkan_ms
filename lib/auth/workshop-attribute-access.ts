export type WorkshopAttributeAccessInput = {
  isInstructor?: boolean;
};

/** Shared Manage workshops UI requires the instructor attribute. */
export function canAccessManageWorkshops(
  input: WorkshopAttributeAccessInput
): boolean {
  return input.isInstructor === true;
}
