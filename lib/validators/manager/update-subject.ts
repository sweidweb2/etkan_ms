import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";
import { subjectFieldsSchema } from "@/lib/validators/manager/create-subject";

export const updateSubjectSchema = subjectFieldsSchema;

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export type UpdateSubjectFormInput = UpdateSubjectInput & {
  id: string;
  class_count?: number;
};

export function parseUpdateSubjectFormData(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return formValidationFailure(
      undefined,
      "Unable to update subject. Please refresh and try again."
    );
  }

  const parsed = safeParseFormData(updateSubjectSchema, {
    name: formData.get("name"),
    nb_sessions: formData.get("nb_sessions"),
    syllabus_link: formData.get("syllabus_link"),
    reference_link: formData.get("reference_link"),
    handout_link: formData.get("handout_link"),
  });

  if (!parsed.success) {
    return parsed;
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      id,
      class_count: parseOptionalClassCount(formData.get("class_count")),
    },
  };
}

function parseOptionalClassCount(
  value: FormDataEntryValue | null
): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
