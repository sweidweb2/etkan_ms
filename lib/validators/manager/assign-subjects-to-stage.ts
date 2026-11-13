import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const optionalStageId = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" || trimmed === "null" ? null : trimmed;
}, z.string().uuid({ message: "Stage not found." }).nullable());

export const assignSubjectsToStageSchema = z.object({
  stage_id: optionalStageId,
  subject_ids: z
    .array(z.string().uuid({ message: "Subject not found." }))
    .min(1, { message: "Select at least one subject." }),
});

export type AssignSubjectsToStageInput = z.infer<
  typeof assignSubjectsToStageSchema
>;

export function parseAssignSubjectsToStageFormData(formData: FormData) {
  const subjectIds = formData
    .getAll("subject_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return safeParseFormData(assignSubjectsToStageSchema, {
    stage_id: formData.get("stage_id"),
    subject_ids: subjectIds,
  });
}
