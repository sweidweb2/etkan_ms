import { z } from "zod";
import { TEAM_DEFAULT_STATUS, TEAM_STATUS_VALUES } from "@/lib/constants/team";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  optionalTeamDate,
  teamNameSchema,
} from "@/lib/validators/manager/create-team";
import type { FieldErrors } from "@/types/auth";

export const updateTeamSchema = z.object({
  id: z.string().uuid({ message: "Team not found." }),
  name: teamNameSchema,
  expected_start_date: optionalTeamDate,
  status: z
    .enum(TEAM_STATUS_VALUES, { message: "Select a team status." })
    .default(TEAM_DEFAULT_STATUS),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export function parseUpdateTeamFormData(formData: FormData):
  | { success: true; data: UpdateTeamInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateTeamSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    expected_start_date: formData.get("expected_start_date"),
    status: formData.get("status") || TEAM_DEFAULT_STATUS,
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
