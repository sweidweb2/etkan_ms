import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  TASK_ATTACHMENT_ALLOWED_MIME_TYPES,
  TASK_ATTACHMENT_ENTITIES,
  TASK_ATTACHMENT_MAX_BYTES,
} from "@/lib/constants/task-attachments";

const allowedMimeSet = new Set<string>(TASK_ATTACHMENT_ALLOWED_MIME_TYPES);

const taskAttachmentFileSchema = z
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
    if (file.size > TASK_ATTACHMENT_MAX_BYTES) {
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

const entitySchema = z.enum([
  TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK,
  TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
]);

export const uploadTaskAttachmentSchema = z.object({
  entity: entitySchema,
  entity_id: z.string().uuid({ message: "Task is required." }),
  file: taskAttachmentFileSchema,
});

export type UploadTaskAttachmentInput = z.infer<
  typeof uploadTaskAttachmentSchema
>;

export const deleteTaskAttachmentSchema = z.object({
  id: z.string().uuid({ message: "Attachment is required." }),
});

export type DeleteTaskAttachmentInput = z.infer<
  typeof deleteTaskAttachmentSchema
>;

export const taskAttachmentSignedUrlSchema = z.object({
  id: z.string().uuid({ message: "Attachment is required." }),
});

export type TaskAttachmentSignedUrlInput = z.infer<
  typeof taskAttachmentSignedUrlSchema
>;

export function parseUploadTaskAttachmentFormData(formData: FormData) {
  return safeParseFormData(uploadTaskAttachmentSchema, {
    entity: formData.get("entity"),
    entity_id: formData.get("entity_id"),
    file: formData.get("file"),
  });
}

export function parseDeleteTaskAttachmentFormData(formData: FormData) {
  return safeParseFormData(deleteTaskAttachmentSchema, {
    id: formData.get("id"),
  });
}

export function parseTaskAttachmentSignedUrlFormData(formData: FormData) {
  return safeParseFormData(taskAttachmentSignedUrlSchema, {
    id: formData.get("id"),
  });
}
