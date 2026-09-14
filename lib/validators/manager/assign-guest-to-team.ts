import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

/** A null team_id moves the guest back to the unassigned guests table. */
export const assignGuestToTeamSchema = z.object({
  guest_id: z.string().uuid({ message: "Guest not found." }),
  team_id: z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" || trimmed === "null" ? null : trimmed;
  }, z.string().uuid({ message: "Team not found." }).nullable()),
});

export type AssignGuestToTeamInput = z.infer<typeof assignGuestToTeamSchema>;

export function parseAssignGuestToTeamFormData(formData: FormData) {
  return safeParseFormData(assignGuestToTeamSchema, {
    guest_id: formData.get("guest_id"),
    team_id: formData.get("team_id"),
  });
}
