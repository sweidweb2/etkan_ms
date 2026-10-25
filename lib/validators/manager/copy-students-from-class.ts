import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const copyStudentsFromClassSchema = z.object({
  source_class_id: z
    .string()
    .trim()
    .min(1, { message: "Please select a class." }),
  studentProfileIds: z
    .array(z.string().trim().min(1, { message: "Please select a student." }))
    .min(1, { message: "Please select at least one student." }),
});

export type CopyStudentsFromClassInput = z.infer<
  typeof copyStudentsFromClassSchema
>;

export function parseCopyStudentsFromClassFormData(formData: FormData):
  | {
      success: true;
      data: CopyStudentsFromClassInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const studentProfileIds = formData
    .getAll("studentProfileIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const parsed = copyStudentsFromClassSchema.safeParse({
    source_class_id: formData.get("source_class_id"),
    studentProfileIds,
  });

  if (!parsed.success) {
    return formValidationFailure(
      zodFieldErrors(parsed.error.flatten().fieldErrors)
    );
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}
