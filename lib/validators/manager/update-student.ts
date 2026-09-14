import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { STUDENT_STATUS_VALUES } from "@/lib/constants/manager-student-status";
import {
  birthDateField,
  emailField,
  fullNameField,
  phoneField,
  usernameField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateStudentSchema = z.object({
  username: usernameField,
  fullName: fullNameField,
  email: emailField,
  birthDate: birthDateField,
  phone: phoneField,
  status: z.enum(STUDENT_STATUS_VALUES, {
    message: "Please select a status.",
  }),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export function parseUpdateStudentFormData(formData: FormData):
  | {
      success: true;
      data: UpdateStudentInput & {
        studentProfileId: string;
        userId: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const studentProfileId = String(formData.get("studentProfileId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!studentProfileId || !userId) {
    return {
      success: false,
      error: "Unable to update student. Please refresh and try again.",
    };
  }

  const parsed = updateStudentSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      studentProfileId,
      userId,
    },
  };
}
