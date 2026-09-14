import { z } from "zod";
import { EXERCISE_LEVEL_VALUES } from "@/lib/constants/exercise-level";
import { EXERCISE_STATUS_VALUES } from "@/lib/constants/exercise-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const emptyTiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const tiptapDocSchema = z
  .object({
    type: z.literal("doc"),
  })
  .passthrough();

export const createExerciseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Exercise title is required." })
    .max(200, { message: "Exercise title must be at most 200 characters." }),
  level: z.enum(EXERCISE_LEVEL_VALUES, {
    message: "Select a valid level.",
  }),
  status: z.enum(EXERCISE_STATUS_VALUES, {
    message: "Select a valid status.",
  }),
  category_ids: z
    .array(z.string().uuid({ message: "Invalid category." }))
    .min(1, { message: "Select at least one category." }),
  body: tiptapDocSchema,
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

function parseBodyFromFormData(formData: FormData): unknown {
  const raw = String(formData.get("body") ?? "").trim();
  if (!raw) {
    return emptyTiptapDoc;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseCategoryIds(formData: FormData): string[] {
  return formData
    .getAll("category_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function parseCreateExerciseFormData(formData: FormData):
  | { success: true; data: CreateExerciseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const body = parseBodyFromFormData(formData);
  if (body === null) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { body: "Exercise body is invalid." },
    };
  }

  const parsed = createExerciseSchema.safeParse({
    title: formData.get("title"),
    level: formData.get("level"),
    status: formData.get("status"),
    category_ids: parseCategoryIds(formData),
    body,
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
