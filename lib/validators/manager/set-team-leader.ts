import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const setTeamLeaderSchema = z.object({
  class_id: z.string().trim().uuid({ message: "Class is required." }),
  student_class_id: z
    .string()
    .trim()
    .uuid({ message: "Enrollment is required." }),
  is_team_leader: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type SetTeamLeaderInput = z.infer<typeof setTeamLeaderSchema>;

export function parseSetTeamLeaderFormData(formData: FormData) {
  return safeParseFormData(setTeamLeaderSchema, {
    class_id: formData.get("class_id"),
    student_class_id: formData.get("student_class_id"),
    is_team_leader: formData.get("is_team_leader"),
  });
}
