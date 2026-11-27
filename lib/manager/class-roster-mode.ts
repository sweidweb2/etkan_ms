/**
 * Named roster load modes — prefer these over ad-hoc boolean flags.
 */

export type ClassRosterMode =
  | {
      mode: "managerDetail";
      /** Skip class lookup when the page already has semester_id (incl. null). */
      semesterId?: string | null;
    }
  | { mode: "teacher" }
  | { mode: "grades" };

export type ResolvedClassRosterOptions = {
  includeAuthEmails: boolean;
  includeRemoveEligibility: boolean;
  semesterId?: string | null;
};

export function resolveClassRosterOptions(
  mode: ClassRosterMode
): ResolvedClassRosterOptions {
  switch (mode.mode) {
    case "teacher":
      return {
        includeAuthEmails: false,
        includeRemoveEligibility: false,
      };
    case "grades":
      return {
        includeAuthEmails: true,
        includeRemoveEligibility: false,
      };
    case "managerDetail":
      return {
        includeAuthEmails: true,
        includeRemoveEligibility: true,
        ...(mode.semesterId !== undefined
          ? { semesterId: mode.semesterId }
          : {}),
      };
  }
}
