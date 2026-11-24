import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const optionalTeamId = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" || trimmed === "null" ? null : trimmed;
}, z.string().uuid({ message: "Team not found." }).nullable());

export const assignSemestersToTeamSchema = z.object({
  team_id: optionalTeamId,
  semester_ids: z
    .array(z.string().uuid({ message: "Semester not found." }))
    .min(1, { message: "Select at least one semester." }),
});

export type AssignSemestersToTeamInput = z.infer<
  typeof assignSemestersToTeamSchema
>;

export function parseAssignSemestersToTeamFormData(formData: FormData) {
  const semesterIds = formData
    .getAll("semester_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return safeParseFormData(assignSemestersToTeamSchema, {
    team_id: formData.get("team_id"),
    semester_ids: semesterIds,
  });
}
