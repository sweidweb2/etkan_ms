import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const createStageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Stage name is required." })
    .max(120, { message: "Stage name must be at most 120 characters." }),
  period: z.coerce
    .number()
    .int({ message: "Period must be a whole number." })
    .min(1, { message: "Period must be at least 1." })
    .max(1000, { message: "Period must be at most 1000." }),
  level: z.coerce
    .number()
    .int({ message: "Level must be a whole number." })
    .min(1, { message: "Level must be at least 1." })
    .max(1000, { message: "Level must be at most 1000." }),
});

export type CreateStageInput = z.infer<typeof createStageSchema>;

export function parseCreateStageFormData(formData: FormData) {
  return safeParseFormData(createStageSchema, {
    name: formData.get("name"),
    period: formData.get("period"),
    level: formData.get("level"),
  });
}
