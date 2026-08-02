import { z } from "zod";
import {
  WORKSHOP_DOCUMENT_ALLOWED_MIME_TYPES,
  WORKSHOP_DOCUMENT_MAX_BYTES,
  WORKSHOP_DOCUMENT_MAX_NAME_LENGTH,
} from "@/lib/constants/manager-workshop-documents";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const allowedMimeSet = new Set<string>(WORKSHOP_DOCUMENT_ALLOWED_MIME_TYPES);

function displayNameSchema() {
  return z
    .string()
    .trim()
    .min(1, { message: "Document name is required." })
    .max(WORKSHOP_DOCUMENT_MAX_NAME_LENGTH, {
      message: `Document name must be at most ${WORKSHOP_DOCUMENT_MAX_NAME_LENGTH} characters.`,
    });
}

const workshopDocumentFileSchema = z
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
    if (file.size > WORKSHOP_DOCUMENT_MAX_BYTES) {
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

export const uploadWorkshopDocumentSchema = z
  .object({
    workshop_id: z.string().uuid({ message: "Workshop is required." }),
    file: workshopDocumentFileSchema,
    name: z.preprocess((value) => {
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    }, z.string()),
  })
  .superRefine((data, ctx) => {
    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) {
      return;
    }
    if (trimmedName.length > WORKSHOP_DOCUMENT_MAX_NAME_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Document name must be at most ${WORKSHOP_DOCUMENT_MAX_NAME_LENGTH} characters.`,
        path: ["name"],
      });
    }
  })
  .transform((data) => {
    const trimmedName = data.name.trim();
    return {
      workshop_id: data.workshop_id,
      file: data.file,
      name: trimmedName.length > 0 ? trimmedName : data.file.name.trim(),
    };
  });

export type UploadWorkshopDocumentInput = z.infer<
  typeof uploadWorkshopDocumentSchema
>;

export const renameWorkshopDocumentSchema = z.object({
  id: z.string().uuid({ message: "Document is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
  name: displayNameSchema(),
});

export type RenameWorkshopDocumentInput = z.infer<
  typeof renameWorkshopDocumentSchema
>;

export const deleteWorkshopDocumentSchema = z.object({
  id: z.string().uuid({ message: "Document is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
});

export type DeleteWorkshopDocumentInput = z.infer<
  typeof deleteWorkshopDocumentSchema
>;

export function parseUploadWorkshopDocumentFormData(formData: FormData):
  | { success: true; data: UploadWorkshopDocumentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = uploadWorkshopDocumentSchema.safeParse({
    workshop_id: formData.get("workshop_id"),
    file: formData.get("file"),
    name: formData.get("name"),
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

export function parseRenameWorkshopDocumentFormData(formData: FormData):
  | { success: true; data: RenameWorkshopDocumentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = renameWorkshopDocumentSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
    name: formData.get("name"),
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

export function parseDeleteWorkshopDocumentFormData(formData: FormData):
  | { success: true; data: DeleteWorkshopDocumentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteWorkshopDocumentSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
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
