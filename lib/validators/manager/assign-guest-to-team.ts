import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

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

export function parseAssignGuestToTeamFormData(formData: FormData):
  | { success: true; data: AssignGuestToTeamInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = assignGuestToTeamSchema.safeParse({
    guest_id: formData.get("guest_id"),
    team_id: formData.get("team_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
