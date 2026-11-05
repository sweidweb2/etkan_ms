import { z } from "zod";
import {
  formValidationFailure,
  type ParseFormResult,
} from "@/lib/validators/safe-parse-form-data";

const studentTargetSchema = z.object({
  user_id: z.string().trim().uuid(),
  student_profile_id: z.string().trim().uuid(),
});

export type StudentAvatarTargetInput = z.infer<typeof studentTargetSchema>;

export type UpdateStudentAvatarInput = StudentAvatarTargetInput & {
  image: File | null;
};

function fileOrNull(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

/** Self upload: only the image. Identity comes from the session. */
export function readOwnAvatarFile(formData: FormData): File | null {
  return fileOrNull(formData.get("image"));
}

export function parseStudentAvatarTargetFormData(
  formData: FormData
): ParseFormResult<StudentAvatarTargetInput> {
  const parsed = studentTargetSchema.safeParse({
    user_id: formData.get("user_id"),
    student_profile_id: formData.get("student_profile_id"),
  });
  if (!parsed.success) {
    return formValidationFailure(undefined, "Student not found.");
  }
  return { success: true, data: parsed.data };
}

export function parseUpdateStudentAvatarFormData(
  formData: FormData
): ParseFormResult<UpdateStudentAvatarInput> {
  const target = parseStudentAvatarTargetFormData(formData);
  if (!target.success) {
    return target;
  }
  return {
    success: true,
    data: { ...target.data, image: fileOrNull(formData.get("image")) },
  };
}
