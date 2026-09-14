import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  TEAM_DEFAULT_STATUS,
  TEAM_NAME_MAX,
  TEAM_STATUS_VALUES,
} from "@/lib/constants/team";

/** Empty string from an unfilled date input means "no expected start date". */
export const optionalTeamDate = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}, z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Expected start date must be a valid date.",
  })
  .nullable());

export const teamNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Team name is required." })
  .max(TEAM_NAME_MAX, {
    message: `Team name must be at most ${TEAM_NAME_MAX} characters.`,
  });

export const createTeamSchema = z.object({
  name: teamNameSchema,
  expected_start_date: optionalTeamDate,
  status: z
    .enum(TEAM_STATUS_VALUES, { message: "Select a team status." })
    .default(TEAM_DEFAULT_STATUS),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export function parseCreateTeamFormData(formData: FormData) {
  return safeParseFormData(createTeamSchema, {
    name: formData.get("name"),
    expected_start_date: formData.get("expected_start_date"),
    status: formData.get("status") || TEAM_DEFAULT_STATUS,
  });
}
