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
