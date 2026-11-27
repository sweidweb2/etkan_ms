import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  semesterCodeSchema,
  semesterFieldsSchema,
} from "@/lib/validators/manager/create-semester";

export const updateSemesterSchema = semesterFieldsSchema.extend({
  id: z.string().trim().uuid({ message: "Semester is required." }),
  semester_code: semesterCodeSchema,
});

export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;

export function parseUpdateSemesterFormData(formData: FormData) {
  return safeParseFormData(updateSemesterSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    semester_code: formData.get("semester_code"),
  });
}
