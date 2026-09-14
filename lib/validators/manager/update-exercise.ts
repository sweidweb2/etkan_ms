import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";
import {
  exerciseFieldsSchema,
  parseBodyFromFormData,
  parseCategoryIds,
} from "@/lib/validators/manager/create-exercise";

export const updateExerciseSchema = exerciseFieldsSchema.extend({
  id: z.string().uuid({ message: "Exercise not found." }),
});

export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;

export function parseUpdateExerciseFormData(formData: FormData) {
  const body = parseBodyFromFormData(formData);
  if (body === null) {
    return formValidationFailure({ body: ["Exercise body is invalid."] });
  }

  return safeParseFormData(updateExerciseSchema, {
    id: formData.get("id"),
    title: formData.get("title"),
    level: formData.get("level"),
    status: formData.get("status"),
    category_ids: parseCategoryIds(formData),
    body,
  });
}
