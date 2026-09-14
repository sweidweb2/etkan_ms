import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { TEAM_DEFAULT_STATUS, TEAM_STATUS_VALUES } from "@/lib/constants/team";
import {
  optionalTeamDate,
  teamNameSchema,
} from "@/lib/validators/manager/create-team";

export const updateTeamSchema = z.object({
  id: z.string().uuid({ message: "Team not found." }),
  name: teamNameSchema,
  expected_start_date: optionalTeamDate,
  status: z
    .enum(TEAM_STATUS_VALUES, { message: "Select a team status." })
    .default(TEAM_DEFAULT_STATUS),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export function parseUpdateTeamFormData(formData: FormData) {
  return safeParseFormData(updateTeamSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    expected_start_date: formData.get("expected_start_date"),
    status: formData.get("status") || TEAM_DEFAULT_STATUS,
  });
}
