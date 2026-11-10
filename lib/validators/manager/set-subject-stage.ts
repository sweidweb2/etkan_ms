import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const optionalStageId = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" || trimmed === "null" ? null : trimmed;
}, z.string().uuid({ message: "Stage not found." }).nullable());

export const setSubjectStageSchema = z.object({
  subject_id: z.string().uuid({ message: "Subject not found." }),
  stage_id: optionalStageId,
});

export type SetSubjectStageInput = z.infer<typeof setSubjectStageSchema>;

export function parseSetSubjectStageFormData(formData: FormData) {
  return safeParseFormData(setSubjectStageSchema, {
    subject_id: formData.get("subject_id"),
    stage_id: formData.get("stage_id"),
  });
}
