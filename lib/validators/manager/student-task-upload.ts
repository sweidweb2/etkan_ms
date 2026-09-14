import { z } from "zod";
import {
  STUDENT_TASK_UPLOAD_ALLOWED_MIME_TYPES,
  STUDENT_TASK_UPLOAD_MAX_BYTES,
} from "@/lib/constants/manager-student-task-uploads";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const allowedMimeSet = new Set<string>(STUDENT_TASK_UPLOAD_ALLOWED_MIME_TYPES);

const studentTaskUploadFileSchema = z
  .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
    message: "A file is required.",
  })
  .superRefine((file, ctx) => {
    if (file.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File is empty.",
      });
    }
    if (file.size > STUDENT_TASK_UPLOAD_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File must be at most 10 MB.",
      });
    }
    const mime = file.type.trim();
    if (!mime || !allowedMimeSet.has(mime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File type is not allowed.",
      });
    }
    if (!file.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File name is required.",
      });
    }
  });

export const uploadStudentTaskFileSchema = z.object({
  student_task_id: z.string().uuid({ message: "Student task is required." }),
  file: studentTaskUploadFileSchema,
});

export type UploadStudentTaskFileInput = z.infer<
  typeof uploadStudentTaskFileSchema
>;

export const deleteStudentTaskUploadSchema = z.object({
  id: z.string().uuid({ message: "Upload is required." }),
});

export type DeleteStudentTaskUploadInput = z.infer<
  typeof deleteStudentTaskUploadSchema
>;

export const studentTaskUploadSignedUrlSchema = z.object({
  id: z.string().uuid({ message: "Upload is required." }),
});

export type StudentTaskUploadSignedUrlInput = z.infer<
  typeof studentTaskUploadSignedUrlSchema
>;

export function parseUploadStudentTaskFileFormData(formData: FormData):
  | { success: true; data: UploadStudentTaskFileInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = uploadStudentTaskFileSchema.safeParse({
    student_task_id: formData.get("student_task_id"),
    file: formData.get("file"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseDeleteStudentTaskUploadFormData(formData: FormData):
  | { success: true; data: DeleteStudentTaskUploadInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteStudentTaskUploadSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseStudentTaskUploadSignedUrlFormData(formData: FormData):
  | { success: true; data: StudentTaskUploadSignedUrlInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = studentTaskUploadSignedUrlSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
