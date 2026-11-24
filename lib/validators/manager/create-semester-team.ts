import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const createSemesterTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Team name is required." })
    .max(120, { message: "Team name must be at most 120 characters." }),
});

export type CreateSemesterTeamInput = z.infer<typeof createSemesterTeamSchema>;

export function parseCreateSemesterTeamFormData(formData: FormData) {
  return safeParseFormData(createSemesterTeamSchema, {
    name: formData.get("name"),
  });
}
