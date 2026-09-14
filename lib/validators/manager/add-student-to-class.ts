import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const addStudentToClassSchema = z.object({
  studentProfileId: z
    .string()
    .trim()
    .min(1, { message: "Please select a student." }),
});

export type AddStudentToClassInput = z.infer<typeof addStudentToClassSchema>;

export const addStudentsToClassSchema = z.object({
  studentProfileIds: z
    .array(z.string().trim().min(1, { message: "Please select a student." }))
    .min(1, { message: "Please select at least one student." }),
});

export type AddStudentsToClassInput = z.infer<typeof addStudentsToClassSchema>;

export function parseAddStudentToClassFormData(formData: FormData):
  | {
      success: true;
      data: AddStudentToClassInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const parsed = addStudentToClassSchema.safeParse({
    studentProfileId: formData.get("studentProfileId"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}

export function parseAddStudentsToClassFormData(formData: FormData):
  | {
      success: true;
      data: AddStudentsToClassInput & { class_id: string };
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

  const parsed = addStudentsToClassSchema.safeParse({ studentProfileIds });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}
